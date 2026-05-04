import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PaymentStatus } from '@emas/db'
import { PrismaService } from '../prisma/prisma.service'
import { CreateInvoiceDto, ListInvoiceQueryDto } from './dto/invoice.dto'

const CHIP_BASE_URLS: Record<string, string> = {
  production: 'https://gate.chip-in.asia',
  sandbox: 'https://gate.chip-in.asia',
}

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, ownerId: string, query: ListInvoiceQueryDto): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ownerId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNo: { contains: query.search } },
              { orderId: { contains: query.search } },
              { order: { orderNo: { contains: query.search } } },
              { order: { customerName: { contains: query.search } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { order: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ])

    return {
      items: items.map((item) => this.toInvoiceView(item as Record<string, unknown>)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(tenantId: string, ownerId: string, id: string): Promise<Record<string, unknown> | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, ownerId },
      include: { order: { include: { items: true, payments: true } } },
    })
    if (!invoice) return null
    return this.toInvoiceView(invoice as unknown as Record<string, unknown>)
  }

  async create(tenantId: string, ownerId: string, dto: CreateInvoiceDto): Promise<Record<string, unknown> | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        tenantId,
        ownerId,
        OR: [
          { id: dto.orderId },
          { orderNo: dto.orderId },
        ],
      },
      select: { id: true },
    })

    if (!order) return null

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        ownerId,
        orderId: order.id,
        type: dto.type,
        invoiceNo: this.generateInvoiceNo(dto.type),
        pdfUrl: dto.pdfUrl,
      },
      include: { order: { include: { items: true, payments: true } } },
    })

    return this.toInvoiceView(invoice as unknown as Record<string, unknown>)
  }

  async createCustomerPaymentLink(
    tenantId: string,
    ownerId: string,
    invoiceId: string,
  ): Promise<{ gateway: string; checkoutUrl: string; purchaseId?: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId, ownerId },
      include: { order: true },
    })
    if (!invoice) throw new NotFoundException('Invoice not found')
    if (invoice.type !== 'CUSTOMER') {
      throw new BadRequestException('Only CUSTOMER invoice can generate payment link')
    }

    const chip = await this.prisma.paymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: 'CHIP' } },
    })
    if (!chip || !chip.isEnabled) {
      throw new BadRequestException('CHIP gateway is not enabled')
    }

    const config = (chip.config ?? {}) as Record<string, unknown>
    const secretKey = String(config.secret_key ?? '').trim()
    const brandId = String(config.brand_id ?? '').trim()
    const environment = String(config.environment ?? 'production').toLowerCase()
    if (!secretKey || !brandId) {
      throw new BadRequestException('CHIP brand_id/secret_key is missing in payment settings')
    }

    const total = Number(invoice.order.total ?? 0)
    if (!Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('Invalid invoice total amount')
    }

    const appBaseUrl = (process.env.APP_BASE_URL ?? process.env.WEB_APP_URL ?? 'https://dev.emas.my').replace(/\/$/, '')
    const successUrl = `${appBaseUrl}/dashboard/invoices?invoiceId=${invoice.id}&syncPayment=1`

    const baseUrl = CHIP_BASE_URLS[environment] ?? CHIP_BASE_URLS.production
    const payload = {
      brand_id: brandId,
      reference: invoice.invoiceNo,
      client: {
        full_name: invoice.order.customerName || 'Customer',
        email: invoice.order.customerEmail || 'customer@no-email.local',
        phone: invoice.order.customerPhone || '',
      },
      purchase: {
        currency: 'MYR',
        products: [
          {
            name: `Invoice ${invoice.invoiceNo}`,
            price: Math.round(total * 100),
            quantity: 1,
          },
        ],
      },
      platform: 'api',
      creator_agent: 'api',
      success_redirect: successUrl,
      failure_redirect: successUrl,
      cancel_redirect: successUrl,
    }

    const res = await fetch(`${baseUrl}/api/v1/purchases/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new BadRequestException(`CHIP create purchase failed ${res.status}: ${body}`)
    }

    const data = await res.json() as { checkout_url?: string; id?: string }
    const checkoutUrl = String(data.checkout_url ?? '').trim()
    if (!checkoutUrl) {
      throw new BadRequestException('CHIP purchase created without checkout URL')
    }

    await this.prisma.orderPayment.create({
      data: {
        orderId: invoice.orderId,
        amount: total,
        method: 'CHIP',
        status: PaymentStatus.UNPAID,
        gatewayRef: String(data.id ?? invoice.invoiceNo),
      },
    })

    return {
      gateway: 'CHIP',
      checkoutUrl,
      purchaseId: data.id,
    }
  }

  async syncCustomerPaymentStatus(
    tenantId: string,
    ownerId: string,
    invoiceId: string,
  ): Promise<{ updated: boolean; chipStatus: string; paymentStatus: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId, ownerId },
      include: { order: true },
    })
    if (!invoice) throw new NotFoundException('Invoice not found')
    if (invoice.type !== 'CUSTOMER') {
      throw new BadRequestException('Only CUSTOMER invoice can sync payment status')
    }

    const chipPayment = await this.prisma.orderPayment.findFirst({
      where: { orderId: invoice.orderId, method: 'CHIP' },
      orderBy: { createdAt: 'desc' },
    })
    if (!chipPayment || !chipPayment.gatewayRef) {
      throw new BadRequestException('No CHIP payment record found for this invoice')
    }

    const chip = await this.prisma.paymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: 'CHIP' } },
    })
    if (!chip || !chip.isEnabled) {
      throw new BadRequestException('CHIP gateway is not enabled')
    }

    const config = (chip.config ?? {}) as Record<string, unknown>
    const secretKey = String(config.secret_key ?? '').trim()
    const environment = String(config.environment ?? 'production').toLowerCase()
    if (!secretKey) {
      throw new BadRequestException('CHIP secret_key is missing in payment settings')
    }

    const baseUrl = CHIP_BASE_URLS[environment] ?? CHIP_BASE_URLS.production
    const res = await fetch(`${baseUrl}/api/v1/purchases/${chipPayment.gatewayRef}/`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new BadRequestException(`CHIP fetch purchase failed ${res.status}: ${body}`)
    }

    const data = await res.json() as { status?: string }
    const chipStatus = String(data.status ?? '').toLowerCase()
    const isPaid = chipStatus === 'paid'

    if (isPaid) {
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: invoice.orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        }),
        this.prisma.orderPayment.update({
          where: { id: chipPayment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: chipPayment.paidAt ?? new Date(),
          },
        }),
      ])

      return {
        updated: true,
        chipStatus,
        paymentStatus: PaymentStatus.PAID,
      }
    }

    return {
      updated: false,
      chipStatus,
      paymentStatus: String(invoice.order.paymentStatus),
    }
  }

  private toInvoiceView(invoice: Record<string, unknown>): Record<string, unknown> {
    const order = (invoice.order as Record<string, unknown> | undefined) ?? {}
    const subtotal = Number(order.subtotal ?? 0)
    const shippingFee = Number(order.shippingFee ?? 0)
    const discount = Number(order.discount ?? 0)
    const total = Number(order.total ?? subtotal + shippingFee - discount)
    const paymentStatus = String(order.paymentStatus ?? 'UNPAID')

    return {
      ...invoice,
      status: paymentStatus,
      subtotal,
      tax: 0,
      discount,
      total,
      items: (order.items as unknown[]) ?? (invoice.items as unknown[]) ?? [],
      checkoutUrl: null,
    }
  }

  private generateInvoiceNo(type: string): string {
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d = String(now.getUTCDate()).padStart(2, '0')
    const h = String(now.getUTCHours()).padStart(2, '0')
    const i = String(now.getUTCMinutes()).padStart(2, '0')
    const s = String(now.getUTCSeconds()).padStart(2, '0')
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    const prefix = type === 'SELLER' ? 'INV-S' : type === 'CUSTOMER' ? 'INV-C' : 'DN'
    return `${prefix}-${y}${m}${d}-${h}${i}${s}-${rand}`
  }
}
