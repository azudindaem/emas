import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@emas/db'
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

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { shipment: true },
    })
    if (!order) throw new NotFoundException('Order not found')

    // Validate courier account
    const courierAccount = await this.prisma.courierAccount.findFirst({
      where: { id: dto.courierAccountId, tenantId, isActive: true },
    })
    if (!courierAccount) throw new NotFoundException('Active courier account not found')

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

    return {
      shipment,
      awbNo: mockAwb,
      trackingUrl: mockTrackingUrl,
      provider: courierAccount.provider,
      note: 'AWB generated (stub — integrate courier SDK for live booking)',
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

  // ─── Tracking ──────────────────────────────────────────────────────────────

  async trackShipment(tenantId: string, dto: TrackShipmentDto) {
    const courierAccount = await this.prisma.courierAccount.findFirst({
      where: { id: dto.courierAccountId, tenantId, isActive: true },
    })
    if (!courierAccount) throw new NotFoundException('Active courier account not found')

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

    // Stub: return mock rates per active courier
    const rates = accounts.map((acc) => ({
      provider: acc.provider,
      courierAccountId: acc.id,
      label: acc.label,
      serviceType: 'standard',
      estimatedDays: 3,
      price: (dto.weightKg * 3.5 + 5).toFixed(2),
      currency: 'MYR',
      note: 'Rate stub — integrate courier SDK for live rates',
    }))

    return { rates, from: dto.fromPostcode, to: dto.toPostcode, weightKg: dto.weightKg }
  }

  // ─── Webhook Handler ──────────────────────────────────────────────────────

  async handleWebhook(provider: string, payload: Record<string, unknown>) {
    // Stub: parse provider-specific payload and update shipment status
    const awbNo = (payload['awbNo'] ?? payload['tracking_number'] ?? payload['waybill']) as string | undefined
    if (!awbNo) return { received: true, processed: false, reason: 'No AWB in payload' }

    const shipment = await this.prisma.orderShipment.findFirst({ where: { awbNo } })
    if (!shipment) return { received: true, processed: false, reason: 'Shipment not found' }

    // Map provider status → ShipmentStatus (stub mapping)
    const statusMap: Record<string, string> = {
      picked_up: 'PICKED_UP',
      in_transit: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      failed: 'FAILED',
      returned: 'RETURNED',
    }
    const rawStatus = ((payload['status'] as string) ?? '').toLowerCase()
    const mappedStatus = statusMap[rawStatus]

    if (mappedStatus) {
      await this.prisma.orderShipment.update({
        where: { id: shipment.id },
        data: { status: mappedStatus as any },
      })
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

