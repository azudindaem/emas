import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, OrderStatus } from '@emas/db'
import { WebhookDispatcherService } from '../webhook/webhook-dispatcher.service'
import {
  CreateCourierAccountDto,
  UpdateCourierAccountDto,
  GenerateAwbDto,
  BulkGenerateAwbDto,
  UpdateShipmentStatusDto,
  TrackShipmentDto,
  GetRateDto,
  ListShipmentsQueryDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  CreateShippingRateDto,
  UpdateShippingRateDto,
  UpdateShippingDefaultSettingDto,
} from './dto/shipping.dto'

interface ParceldailyAddress {
  fullName: string
  countryCode: string
  phone: string
  email?: string
  line1: string
  line2?: string
  city: string
  postcode: string
  state: string
  country: string
}

interface ParceldailyCredentials {
  provider?: string
  environment?: string
  mode?: string
  baseUrl?: string
  token?: string
  merchantId?: string
  serviceProvider?: string
  pickupAddress?: ParceldailyAddress
  isDropoff?: boolean
  isNotify?: string
  isReschedule?: string
}

interface ParceldailyBillingAddress {
  fullName: string
  countryCode: string
  phone: string
  email: string
  line1: string
  line2: string
  city: string
  postcode: string
  state: string
  country: string
}

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

  private dispatchShipmentCreatedWebhook(
    tenantId: string,
    shipment: {
      id: string
      orderId: string
      awbNo: string | null
      trackingUrl: string | null
      status: string
      createdAt: Date
      updatedAt: Date
    },
    order: {
      orderNo: string
      customerName: string
      customerPhone: string
      customerEmail: string | null
      shippingAddress: Prisma.JsonValue
      items: Array<{ id: string; name: string; sku: string | null; quantity: number }>
    },
    courier: { id: string; label: string; provider: string },
  ) {
    this.webhookDispatcher.dispatch(tenantId, 'shipment.created', {
      id: shipment.id,
      orderId: shipment.orderId,
      orderNo: order.orderNo,
      courier: {
        id: courier.id,
        label: courier.label,
        provider: courier.provider,
      },
      trackingNo: shipment.awbNo,
      awbNo: shipment.awbNo,
      trackingUrl: shipment.trackingUrl,
      status: shipment.status,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
      },
      shippingAddress: order.shippingAddress,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
      })),
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    })
  }

  private isParceldailyCredentials(credentials: unknown): credentials is ParceldailyCredentials {
    if (!credentials || typeof credentials !== 'object') return false
    const value = credentials as ParceldailyCredentials
    return (
      String(value.provider ?? '').toLowerCase() === 'parceldaily' ||
      String(value.baseUrl ?? '').includes('parceldaily.com')
    )
  }

  private getParceldailyConfig(account: { credentials: unknown }) {
    const credentials = account.credentials as ParceldailyCredentials
    if (!this.isParceldailyCredentials(credentials)) {
      throw new BadRequestException('Courier account is not configured for ParcelDaily')
    }

    const environment = String(credentials.environment ?? credentials.mode ?? 'sandbox').toLowerCase()
    const defaultBaseUrl = environment === 'production'
      ? 'https://api.parceldaily.com'
      : 'https://api.sandbox.parceldaily.com'
    const baseUrl = (credentials.baseUrl ?? defaultBaseUrl).replace(/\/$/, '')
    const token = String(credentials.token ?? '').trim()
    const merchantId = String(credentials.merchantId ?? '').trim()

    if (!token || !merchantId) {
      throw new BadRequestException('ParcelDaily credentials require token and merchantId')
    }

    return {
      baseUrl,
      environment,
      token,
      merchantId,
      serviceProvider: String(credentials.serviceProvider ?? 'jnt').toLowerCase(),
      pickupAddress: credentials.pickupAddress,
      isDropoff: credentials.isDropoff ?? false,
      isNotify: credentials.isNotify,
      isReschedule: credentials.isReschedule,
    }
  }

  private async callParceldaily(
    config: { baseUrl: string; token: string; merchantId: string },
    path: string,
    body: Record<string, unknown>,
  ) {
    const url = `${config.baseUrl}${path}`
    console.log('[ParcelDaily] POST', url, JSON.stringify(body))
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: config.token,
        merchantid: config.merchantId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const payload = await response.json().catch(() => ({}))
    console.log('[ParcelDaily] Response', response.status, JSON.stringify(payload))
    if (!response.ok) {
      const detail = String(
        (payload as Record<string, unknown>)['error'] ??
        (payload as Record<string, unknown>)['message'] ??
        '',
      ).trim()
      throw new BadRequestException({
        message: detail
          ? `ParcelDaily request failed (${response.status}): ${detail}`
          : `ParcelDaily request failed (${response.status})`,
        response: payload,
      })
    }
    return payload as Record<string, unknown>
  }

  private extractParceldailyPrice(quotePayload: Record<string, unknown>, serviceProvider: string): number {
    const success = (quotePayload['success'] ?? quotePayload['data']) as Record<string, unknown> | undefined
    if (!success) throw new BadRequestException('ParcelDaily quote response missing success/data payload')

    const key = `${serviceProvider.toLowerCase()}Price`
    const value = success[key]
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) {
      throw new BadRequestException(`No valid ${key} found in ParcelDaily quote response`)
    }
    return num
  }

  private extractParceldailyConnote(payload?: Record<string, unknown>): string | null {
    if (!payload) return null
    const root = (payload['data'] ?? payload['success'] ?? payload) as Record<string, unknown>
    const raw = root?.['connote'] ?? root?.['consign_no'] ?? root?.['trackingNo'] ?? root?.['awbNo']
    const connote = String(raw ?? '').trim()
    return connote || null
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async requestParceldailyPay(
    config: { baseUrl: string; token: string; merchantId: string },
    orderId: string,
    billingAddress: ParceldailyBillingAddress,
  ) {
    return this.callParceldaily(config, '/v1/partner/order/pay', {
      orderId,
      billingAddress,
    })
  }

  private async resolveParceldailyConnoteWithRetry(
    config: { baseUrl: string; token: string; merchantId: string },
    orderId: string,
    billingAddress: ParceldailyBillingAddress,
    attempts: number,
    intervalMs: number,
  ) {
    let lastPayload: Record<string, unknown> | null = null
    for (let i = 0; i < attempts; i++) {
      if (i > 0) {
        await this.sleep(intervalMs)
      }

      try {
        const payload = await this.requestParceldailyPay(config, orderId, billingAddress)
        lastPayload = payload
        const connote = this.extractParceldailyConnote(payload)
        if (connote) {
          return { connote, checkoutPayload: payload }
        }
      } catch (err: unknown) {
        console.log('[ParcelDaily] Pay retry failed:', err instanceof Error ? err.message : String(err))
      }
    }

    return { connote: null, checkoutPayload: lastPayload }
  }

  private async reconcileParceldailyTrackingAsync(
    tenantId: string,
    shipmentId: string,
    provisionalAwb: string,
    trackingUrl: string,
    config: { baseUrl: string; token: string; merchantId: string },
    orderId: string,
    billingAddress: ParceldailyBillingAddress,
    order: {
      orderNo: string
      customerName: string
      customerPhone: string
      customerEmail: string | null
      shippingAddress: Prisma.JsonValue
      items: Array<{ id: string; name: string; sku: string | null; quantity: number }>
    },
    courier: { id: string; label: string; provider: string },
  ) {
    const resolved = await this.resolveParceldailyConnoteWithRetry(config, orderId, billingAddress, 12, 5000)
    if (!resolved.connote) return

    const current = await this.prisma.orderShipment.findFirst({
      where: { id: shipmentId, awbNo: provisionalAwb },
    })
    if (!current) return

    const updated = await this.prisma.orderShipment.update({
      where: { id: shipmentId },
      data: {
        awbNo: resolved.connote,
        trackingUrl,
        status: 'BOOKED',
      },
    })

    this.dispatchShipmentCreatedWebhook(tenantId, updated, order, courier)
  }

  // ─── Courier Accounts ──────────────────────────────────────────────────────

  async listCourierAccounts(tenantId: string) {
    return this.prisma.courierAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCourierAccount(tenantId: string, id: string) {
    const account = await this.prisma.courierAccount.findFirst({
      where: { id, tenantId },
    })
    if (!account) throw new NotFoundException('Courier account not found')
    return account
  }

  async createCourierAccount(tenantId: string, dto: CreateCourierAccountDto) {
    return this.prisma.courierAccount.create({
      data: {
        tenantId,
        provider: dto.provider,
        label: dto.label,
        credentials: dto.credentials as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    })
  }

  async updateCourierAccount(tenantId: string, id: string, dto: UpdateCourierAccountDto) {
    await this.getCourierAccount(tenantId, id)
    return this.prisma.courierAccount.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.credentials !== undefined && {
          credentials: dto.credentials as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteCourierAccount(tenantId: string, id: string) {
    await this.getCourierAccount(tenantId, id)
    await this.prisma.courierAccount.delete({ where: { id } })
    return { success: true }
  }

  // ─── Shipments ─────────────────────────────────────────────────────────────

  async listShipments(tenantId: string, query: ListShipmentsQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where: Prisma.OrderShipmentWhereInput = {
      order: { tenantId },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { awbNo: { contains: query.search } },
              { order: { orderNo: { contains: query.search } } },
              { order: { customerName: { contains: query.search } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.orderShipment.findMany({
        where,
        include: { order: { select: { orderNo: true, customerName: true, customerPhone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.orderShipment.count({ where }),
    ])

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getShipment(tenantId: string, id: string) {
    const shipment = await this.prisma.orderShipment.findFirst({
      where: { id, order: { tenantId } },
      include: { order: true },
    })
    if (!shipment) throw new NotFoundException('Shipment not found')
    return shipment
  }

  // ─── AWB Generation ────────────────────────────────────────────────────────

  async generateAwb(tenantId: string, dto: GenerateAwbDto) {
    // Validate order belongs to tenant
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, tenantId },
      include: { shipment: true, items: true },
    })
    if (!order) throw new NotFoundException('Order not found')

    // Validate courier account
    const courierAccount = await this.prisma.courierAccount.findFirst({
      where: { id: dto.courierAccountId, tenantId, isActive: true },
    })
    if (!courierAccount) throw new NotFoundException('Active courier account not found')

    if (courierAccount.provider === 'OTHERS') {
      const config = this.getParceldailyConfig(courierAccount)
      const pickupAddress = config.pickupAddress
      if (!pickupAddress) {
        throw new BadRequestException('ParcelDaily pickupAddress is required in courier credentials')
      }

      const destination = order.shippingAddress as Record<string, unknown>
      const receiverPhoneRaw = String(order.customerPhone ?? '').replace(/\D+/g, '')
      const receiverPhone = receiverPhoneRaw.startsWith('60') ? receiverPhoneRaw.slice(2) : receiverPhoneRaw
      const rawCustomerEmail = typeof order.customerEmail === 'string' ? order.customerEmail.trim() : ''
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const fallbackEmail = `no-reply+${order.orderNo.toLowerCase()}@emas.my`
      const receiverEmail = emailPattern.test(rawCustomerEmail) ? rawCustomerEmail : fallbackEmail
      const canUseNotifyFeatures = Boolean(receiverEmail)

      const weight = dto.weightKg ?? 1
      const destinationCountry = String(destination['country'] ?? 'Malaysia')

      const quotePayload = await this.callParceldaily(config, '/v1/partner/merchant/quote', {
        origin: pickupAddress.postcode,
        destination: String(destination['postcode'] ?? ''),
        originCountry: pickupAddress.country,
        destinationCountry,
        weight,
        ...(dto.cod ? { cod: dto.cod } : {}),
        ...(dto.insurance ? { insurance: dto.insurance } : {}),
      })

      const quotedPrice = this.extractParceldailyPrice(quotePayload, config.serviceProvider)
      const firstItem = order.items[0]
      const content = String(firstItem?.name ?? dto.notes ?? 'General goods').slice(0, 50)

      const buildCreateBody = (price: number) => ({
        serviceProvider: config.serviceProvider,
        pickupAddress,
        clientAddress: {
          fullName: String(order.customerName ?? 'Receiver'),
          countryCode: '+60',
          phone: receiverPhone,
          email: receiverEmail,
          line1: String(destination['line1'] ?? ''),
          line2: String(destination['line2'] ?? ''),
          city: String(destination['city'] ?? ''),
          postcode: String(destination['postcode'] ?? ''),
          state: String(destination['state'] ?? ''),
          country: destinationCountry,
        },
        kg: weight,
        price,
        content,
        content_value: Number(order.total ?? 0),
        quantity: Number(firstItem?.quantity ?? 1),
        cod: dto.cod ?? 0,
        isDropoff: config.isDropoff,
        reference: dto.reference ?? order.orderNo,
        ...(canUseNotifyFeatures && config.isNotify ? { isNotify: config.isNotify } : {}),
        ...(canUseNotifyFeatures && config.isReschedule ? { isReschedule: config.isReschedule } : {}),
      })

      let createPayload: Record<string, unknown>
      try {
        createPayload = await this.callParceldaily(config, '/v1/partner/order/create', buildCreateBody(quotedPrice))
      } catch (err: unknown) {
        let errMsg = ''
        if (err && typeof err === 'object' && 'getResponse' in err) {
          const resp = (err as { getResponse: () => unknown }).getResponse() as Record<string, unknown>
          const inner = resp?.['response'] as Record<string, unknown> | undefined
          errMsg = String(inner?.['error'] ?? inner?.['message'] ?? '')
        }

        // Reference already taken — extract existing orderId and proceed to pay
        const refMatch = errMsg.match(/Reference has been taken by Order #(\S+)/)
        if (refMatch) {
          console.log(`[ParcelDaily] Reference taken, reusing existing orderId ${refMatch[1]}`)
          createPayload = { success: { objectId: refMatch[1] } }
        }
        // Price mismatch — retry with server's calculated price
        else {
          const priceMatch = errMsg.match(/Server calculated price \(([0-9.]+)\)/)
          if (priceMatch) {
            const serverPrice = parseFloat(priceMatch[1])
            console.log(`[ParcelDaily] Price mismatch — retrying with server price ${serverPrice}`)
            createPayload = await this.callParceldaily(config, '/v1/partner/order/create', buildCreateBody(serverPrice))
          } else {
            throw err
          }
        }
      }

      const created = (createPayload['success'] ?? createPayload['data']) as Record<string, unknown> | undefined
      const orderId = String(created?.['objectId'] ?? created?.['orderId'] ?? '')
      if (!orderId) {
        throw new BadRequestException('ParcelDaily create order succeeded but no orderId/objectId returned')
      }

      const billingAddress: ParceldailyBillingAddress = {
        fullName: pickupAddress.fullName,
        countryCode: pickupAddress.countryCode ?? '+60',
        phone: pickupAddress.phone,
        email: pickupAddress.email ?? '',
        line1: pickupAddress.line1,
        line2: pickupAddress.line2 ?? '',
        city: pickupAddress.city,
        postcode: pickupAddress.postcode,
        state: pickupAddress.state,
        country: pickupAddress.country ?? 'Malaysia',
      }

      let checkoutPayload: Record<string, unknown> = {}
      try {
        checkoutPayload = await this.requestParceldailyPay(config, orderId, billingAddress)
      } catch (payErr: unknown) {
        // Pay may fail in sandbox due to missing billing address in merchant account profile.
        // Use orderId as provisional AWB so the shipment is still recorded.
        console.log('[ParcelDaily] Pay failed — using orderId as provisional AWB:', payErr instanceof Error ? payErr.message : String(payErr))
      }
      let connote = this.extractParceldailyConnote(checkoutPayload)
      if (!connote) {
        const resolved = await this.resolveParceldailyConnoteWithRetry(config, orderId, billingAddress, 6, 5000)
        connote = resolved.connote
        if (resolved.checkoutPayload) {
          checkoutPayload = resolved.checkoutPayload
        }
      }

      const checkout = (checkoutPayload['data'] ?? checkoutPayload['success']) as Record<string, unknown> | undefined
      const awbNo = connote ?? orderId
      const trackingUrl = `${config.baseUrl}/v2/partner/track/`
      const shipmentStatus = connote ? 'BOOKED' : 'PENDING'

      const shipment = await this.prisma.orderShipment.upsert({
        where: { orderId: dto.orderId },
        create: {
          orderId: dto.orderId,
          courierId: dto.courierAccountId,
          awbNo,
          trackingUrl,
          status: shipmentStatus,
        },
        update: {
          courierId: dto.courierAccountId,
          awbNo,
          trackingUrl,
          status: shipmentStatus,
        },
      })
      const webhookOrderPayload = {
        orderNo: order.orderNo,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
        })),
      }
      const webhookCourierPayload = {
        id: courierAccount.id,
        label: courierAccount.label,
        provider: courierAccount.provider === 'OTHERS' && config.serviceProvider
          ? config.serviceProvider.toUpperCase()
          : courierAccount.provider,
      }

      if (connote) {
        this.dispatchShipmentCreatedWebhook(
          tenantId,
          shipment,
          webhookOrderPayload,
          webhookCourierPayload,
        )
      } else {
        console.log(`[ParcelDaily] Tracking not ready yet for order ${orderId}; continuing reconciliation in background`)
        void this.reconcileParceldailyTrackingAsync(
          tenantId,
          shipment.id,
          awbNo,
          trackingUrl,
          config,
          orderId,
          billingAddress,
          webhookOrderPayload,
          webhookCourierPayload,
        )
      }

      return {
        shipment,
        awbNo,
        trackingUrl,
        provider: 'PARCELDAILY',
        trackingPending: !connote,
        parceldaily: {
          orderId,
          quotedPrice,
          checkout,
        },
      }
    }

    // Stub: In production, call courier API here using courierAccount.credentials
    // For now, generate a mock AWB
    const mockAwb = `${courierAccount.provider}-${Date.now()}`
    const mockTrackingUrl = `https://tracking.example.com/${mockAwb}`

    // Upsert shipment
    const shipment = await this.prisma.orderShipment.upsert({
      where: { orderId: dto.orderId },
      create: {
        orderId: dto.orderId,
        courierId: dto.courierAccountId,
        awbNo: mockAwb,
        trackingUrl: mockTrackingUrl,
        status: 'BOOKED',
      },
      update: {
        courierId: dto.courierAccountId,
        awbNo: mockAwb,
        trackingUrl: mockTrackingUrl,
        status: 'BOOKED',
      },
    })

    this.dispatchShipmentCreatedWebhook(
      tenantId,
      shipment,
      {
        orderNo: order.orderNo,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
        })),
      },
      {
        id: courierAccount.id,
        label: courierAccount.label,
        provider: courierAccount.provider,
      },
    )

    return {
      shipment,
      awbNo: mockAwb,
      trackingUrl: mockTrackingUrl,
      provider: courierAccount.provider,
      note: 'AWB generated (stub — integrate courier SDK for live booking)',
    }
  }

  async autoGenerateAwbForOrder(tenantId: string, orderId: string) {
    const defaults = await this.prisma.shippingDefaultSetting.findUnique({ where: { tenantId } })

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { shipment: true },
    })
    if (!order) throw new NotFoundException('Order not found')

    if (order.shipment?.awbNo && order.shipment.status !== 'CANCELLED') {
      return { generated: false, reason: 'AWB already exists', awbNo: order.shipment.awbNo }
    }

    // Resolve courier account
    let courierAccountId = defaults?.defaultCourierId ?? null
    if (!courierAccountId) {
      const fallback = await this.prisma.courierAccount.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      courierAccountId = fallback?.id ?? null
    }

    // Always create/ensure a PENDING shipment record so it appears in the shipping list
    if (!order.shipment) {
      await this.prisma.orderShipment.create({
        data: {
          orderId,
          courierId: courierAccountId,
          status: 'PENDING',
        },
      })
    }

    // Only attempt AWB generation if autoGenerateAwb is enabled and courier is configured
    if (!defaults?.autoGenerateAwb || !courierAccountId) {
      return { generated: false, reason: !defaults?.autoGenerateAwb ? 'autoGenerateAwb disabled' : 'No active courier account configured' }
    }

    try {
      const result = await this.generateAwb(tenantId, {
        orderId,
        courierAccountId,
        weightKg: Number(defaults.defaultWeightKg),
      })
      return { generated: true, result }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // AWB generation failed — shipment remains PENDING, user can retry manually
      return { generated: false, reason: `AWB generation failed: ${message}` }
    }
  }

  async bulkGenerateAwb(tenantId: string, dto: BulkGenerateAwbDto) {
    const results = await Promise.allSettled(
      dto.orderIds.map((orderId) =>
        this.generateAwb(tenantId, {
          orderId,
          courierAccountId: dto.courierAccountId,
          serviceType: dto.serviceType,
        }),
      ),
    )

    const succeeded = results
      .map((r, i) => ({ orderId: dto.orderIds[i], result: r }))
      .filter((x) => x.result.status === 'fulfilled')
      .map((x) => ({ orderId: x.orderId, data: (x.result as PromiseFulfilledResult<unknown>).value }))

    const failed = results
      .map((r, i) => ({ orderId: dto.orderIds[i], result: r }))
      .filter((x) => x.result.status === 'rejected')
      .map((x) => ({ orderId: x.orderId, error: (x.result as PromiseRejectedResult).reason?.message }))

    return { succeeded, failed, total: dto.orderIds.length }
  }

  // ─── Update Shipment Status ────────────────────────────────────────────────

  async updateShipmentStatus(tenantId: string, id: string, dto: UpdateShipmentStatusDto) {
    await this.getShipment(tenantId, id)
    return this.prisma.orderShipment.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.awbNo !== undefined && { awbNo: dto.awbNo }),
        ...(dto.trackingUrl !== undefined && { trackingUrl: dto.trackingUrl }),
        ...(dto.labelUrl !== undefined && { labelUrl: dto.labelUrl }),
      },
    })
  }

  async cancelAwb(tenantId: string, id: string) {
    const shipment = await this.getShipment(tenantId, id)
    if (!shipment.awbNo) throw new BadRequestException('No AWB to cancel')

    const courierAccount = shipment.courierId
      ? await this.prisma.courierAccount.findFirst({ where: { id: shipment.courierId, tenantId, isActive: true } })
      : null

    if (courierAccount?.provider === 'OTHERS') {
      const config = this.getParceldailyConfig(courierAccount)
      // Try to cancel via ParcelDaily — use awbNo as orderId (parceldaily objectId)
      const response = await this.callParceldaily(config, '/v1/partner/order/cancel', {
        orderId: shipment.awbNo,
      }).catch((err: unknown) => {
        console.log('[ParcelDaily] Cancel AWB error:', err instanceof Error ? err.message : String(err))
        return null
      })
      console.log('[ParcelDaily] Cancel response:', JSON.stringify(response))
    }

    // Mark shipment as cancelled regardless of provider response
    await this.prisma.orderShipment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return { cancelled: true, shipmentId: id }
  }

  // ─── Tracking ──────────────────────────────────────────────────────────────

  async trackShipment(tenantId: string, dto: TrackShipmentDto) {
    const courierAccount = await this.prisma.courierAccount.findFirst({
      where: { id: dto.courierAccountId, tenantId, isActive: true },
    })
    if (!courierAccount) throw new NotFoundException('Active courier account not found')

    if (courierAccount.provider === 'OTHERS' && this.isParceldailyCredentials(courierAccount.credentials)) {
      const config = this.getParceldailyConfig(courierAccount)
      const response = await this.callParceldaily(config, '/v2/partner/track/', { connote: dto.awbNo })
      return {
        awbNo: dto.awbNo,
        provider: 'PARCELDAILY',
        tracking: response,
      }
    }

    // Stub: In production, call courier tracking API here
    return {
      awbNo: dto.awbNo,
      provider: courierAccount.provider,
      events: [
        { timestamp: new Date().toISOString(), status: 'INFO', description: 'Tracking stub — integrate courier SDK' },
      ],
    }
  }

  // ─── Label Generation Stub ─────────────────────────────────────────────────

  async generateLabel(tenantId: string, shipmentId: string) {
    const shipment = await this.getShipment(tenantId, shipmentId)
    if (!shipment.awbNo) throw new BadRequestException('AWB not yet generated for this shipment')

    // Stub: In production, call courier label API or generate PDF
    const labelUrl = `https://labels.example.com/${shipment.awbNo}.pdf`
    await this.prisma.orderShipment.update({
      where: { id: shipmentId },
      data: { labelUrl },
    })

    return { labelUrl, note: 'Label URL stub — integrate courier SDK for actual label' }
  }

  // ─── Rate Query Stub ───────────────────────────────────────────────────────

  async getRates(tenantId: string, dto: GetRateDto) {
    const accounts = await this.prisma.courierAccount.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(dto.provider ? { provider: dto.provider } : {}),
      },
    })

    if (accounts.length === 0) throw new NotFoundException('No active courier accounts found')

    const rates = await Promise.all(
      accounts.map(async (acc) => {
        if (acc.provider === 'OTHERS' && this.isParceldailyCredentials(acc.credentials)) {
          const config = this.getParceldailyConfig(acc)
          const quotePayload = await this.callParceldaily(config, '/v1/partner/merchant/quote', {
            origin: dto.fromPostcode,
            destination: dto.toPostcode,
            originCountry: dto.fromCountry ?? 'Malaysia',
            destinationCountry: dto.toCountry ?? 'Malaysia',
            weight: dto.weightKg,
            ...(dto.cod ? { cod: dto.cod } : {}),
            ...(dto.insurance ? { insurance: dto.insurance } : {}),
          })

          return {
            provider: 'PARCELDAILY',
            courierAccountId: acc.id,
            label: acc.label,
            serviceType: config.serviceProvider,
            estimatedDays: null,
            price: this.extractParceldailyPrice(quotePayload, config.serviceProvider).toFixed(2),
            currency: 'MYR',
            note: 'Live rate from ParcelDaily quote API',
            raw: quotePayload,
          }
        }

        return {
          provider: acc.provider,
          courierAccountId: acc.id,
          label: acc.label,
          serviceType: 'standard',
          estimatedDays: 3,
          price: (dto.weightKg * 3.5 + 5).toFixed(2),
          currency: 'MYR',
          note: 'Rate stub — integrate courier SDK for live rates',
        }
      }),
    )

    return { rates, from: dto.fromPostcode, to: dto.toPostcode, weightKg: dto.weightKg }
  }

  // ─── Webhook Handler ──────────────────────────────────────────────────────

  async handleWebhook(provider: string, payload: Record<string, unknown>) {
    // Stub: parse provider-specific payload and update shipment status
    const awbNo = (
      payload['awbNo'] ??
      payload['tracking_number'] ??
      payload['waybill'] ??
      payload['consign_no'] ??
      payload['connote']
    ) as string | undefined
    if (!awbNo) return { received: true, processed: false, reason: 'No AWB in payload' }

    const shipment = await this.prisma.orderShipment.findFirst({ where: { awbNo } })
    if (!shipment) return { received: true, processed: false, reason: 'Shipment not found' }

    // Map provider status/statusGroup → ShipmentStatus
    const rawStatus = String(payload['status'] ?? payload['statusGroup'] ?? '').toLowerCase()
    let mappedStatus: string | undefined
    if (rawStatus.includes('pickup')) mappedStatus = 'PICKED_UP'
    else if (rawStatus.includes('transit') || rawStatus.includes('delivery')) mappedStatus = 'IN_TRANSIT'
    else if (rawStatus.includes('delivered') || rawStatus.includes('closed') || rawStatus.includes('cod amount remitted')) mappedStatus = 'DELIVERED'
    else if (rawStatus.includes('return')) mappedStatus = 'RETURNED'
    else if (rawStatus.includes('failed') || rawStatus.includes('cancel') || rawStatus.includes('problematic')) mappedStatus = 'FAILED'

    if (mappedStatus) {
      await this.prisma.orderShipment.update({
        where: { id: shipment.id },
        data: { status: mappedStatus as any },
      })

      // Keep order lifecycle aligned with shipment lifecycle.
      if (mappedStatus === 'DELIVERED') {
        await this.prisma.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.DELIVERED },
        })
      } else if (mappedStatus === 'PICKED_UP' || mappedStatus === 'IN_TRANSIT') {
        await this.prisma.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.SHIPPED },
        })
      }
    }

    return { received: true, processed: !!mappedStatus, awbNo, status: mappedStatus ?? rawStatus }
  }

  // ─── Shipping Zones ────────────────────────────────────────────────────────

  async listShippingZones(tenantId: string) {
    return this.prisma.shippingZone.findMany({
      where: { tenantId },
      include: { rates: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createShippingZone(tenantId: string, dto: CreateShippingZoneDto) {
    return this.prisma.shippingZone.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        countries: (dto.countries ?? []) as unknown as Prisma.InputJsonValue,
        states: (dto.states ?? []) as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateShippingZone(tenantId: string, id: string, dto: UpdateShippingZoneDto) {
    const zone = await this.prisma.shippingZone.findFirst({ where: { id, tenantId } })
    if (!zone) throw new NotFoundException('Shipping zone not found')
    return this.prisma.shippingZone.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.countries !== undefined && { countries: dto.countries as unknown as Prisma.InputJsonValue }),
        ...(dto.states !== undefined && { states: dto.states as unknown as Prisma.InputJsonValue }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteShippingZone(tenantId: string, id: string) {
    const zone = await this.prisma.shippingZone.findFirst({ where: { id, tenantId } })
    if (!zone) throw new NotFoundException('Shipping zone not found')
    await this.prisma.shippingZone.delete({ where: { id } })
    return { success: true }
  }

  // ─── Shipping Rates ────────────────────────────────────────────────────────

  async listShippingRates(tenantId: string, zoneId: string) {
    const zone = await this.prisma.shippingZone.findFirst({ where: { id: zoneId, tenantId } })
    if (!zone) throw new NotFoundException('Shipping zone not found')
    return this.prisma.shippingRate.findMany({
      where: { tenantId, zoneId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createShippingRate(tenantId: string, zoneId: string, dto: CreateShippingRateDto) {
    const zone = await this.prisma.shippingZone.findFirst({ where: { id: zoneId, tenantId } })
    if (!zone) throw new NotFoundException('Shipping zone not found')
    return this.prisma.shippingRate.create({
      data: {
        tenantId,
        zoneId,
        name: dto.name,
        rateType: dto.rateType as any,
        config: dto.config as unknown as Prisma.InputJsonValue,
        courierId: dto.courierId ?? null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateShippingRate(tenantId: string, zoneId: string, rateId: string, dto: UpdateShippingRateDto) {
    const rate = await this.prisma.shippingRate.findFirst({ where: { id: rateId, zoneId, tenantId } })
    if (!rate) throw new NotFoundException('Shipping rate not found')
    return this.prisma.shippingRate.update({
      where: { id: rateId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.rateType !== undefined && { rateType: dto.rateType as any }),
        ...(dto.config !== undefined && { config: dto.config as unknown as Prisma.InputJsonValue }),
        ...(dto.courierId !== undefined && { courierId: dto.courierId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteShippingRate(tenantId: string, zoneId: string, rateId: string) {
    const rate = await this.prisma.shippingRate.findFirst({ where: { id: rateId, zoneId, tenantId } })
    if (!rate) throw new NotFoundException('Shipping rate not found')
    await this.prisma.shippingRate.delete({ where: { id: rateId } })
    return { success: true }
  }

  // ─── Default Settings ──────────────────────────────────────────────────────

  async getShippingDefaults(tenantId: string) {
    const record = await this.prisma.shippingDefaultSetting.findUnique({ where: { tenantId } })
    if (!record) {
      // Return default values if not configured yet
      return {
        tenantId,
        defaultCourierId: null,
        autoGenerateAwb: false,
        autoAssignCourier: false,
        selfPickupEnabled: false,
        defaultWeightKg: 1,
        defaultLengthCm: 30,
        defaultWidthCm: 20,
        defaultHeightCm: 10,
        pickupSlaDays: 1,
        currencyRates: {},
      }
    }
    return record
  }

  async updateShippingDefaults(tenantId: string, dto: UpdateShippingDefaultSettingDto) {
    return this.prisma.shippingDefaultSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        defaultCourierId: dto.defaultCourierId ?? null,
        autoGenerateAwb: dto.autoGenerateAwb ?? false,
        autoAssignCourier: dto.autoAssignCourier ?? false,
        selfPickupEnabled: dto.selfPickupEnabled ?? false,
        defaultWeightKg: dto.defaultWeightKg ?? 1,
        defaultLengthCm: dto.defaultLengthCm ?? 30,
        defaultWidthCm: dto.defaultWidthCm ?? 20,
        defaultHeightCm: dto.defaultHeightCm ?? 10,
        pickupSlaDays: dto.pickupSlaDays ?? 1,
        currencyRates: (dto.currencyRates ?? {}) as unknown as Prisma.InputJsonValue,
      },
      update: {
        ...(dto.defaultCourierId !== undefined && { defaultCourierId: dto.defaultCourierId }),
        ...(dto.autoGenerateAwb !== undefined && { autoGenerateAwb: dto.autoGenerateAwb }),
        ...(dto.autoAssignCourier !== undefined && { autoAssignCourier: dto.autoAssignCourier }),
        ...(dto.selfPickupEnabled !== undefined && { selfPickupEnabled: dto.selfPickupEnabled }),
        ...(dto.defaultWeightKg !== undefined && { defaultWeightKg: dto.defaultWeightKg }),
        ...(dto.defaultLengthCm !== undefined && { defaultLengthCm: dto.defaultLengthCm }),
        ...(dto.defaultWidthCm !== undefined && { defaultWidthCm: dto.defaultWidthCm }),
        ...(dto.defaultHeightCm !== undefined && { defaultHeightCm: dto.defaultHeightCm }),
        ...(dto.pickupSlaDays !== undefined && { pickupSlaDays: dto.pickupSlaDays }),
        ...(dto.currencyRates !== undefined && { currencyRates: dto.currencyRates as unknown as Prisma.InputJsonValue }),
      },
    })
  }
}

