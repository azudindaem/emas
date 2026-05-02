import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateInvoiceDto, ListInvoiceQueryDto } from './dto/invoice.dto'

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
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(tenantId: string, ownerId: string, id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.invoice.findFirst({
      where: { id, tenantId, ownerId },
      include: { order: { include: { items: true, payments: true } } },
    }) as Promise<Record<string, unknown> | null>
  }

  async create(tenantId: string, ownerId: string, dto: CreateInvoiceDto): Promise<Record<string, unknown> | null> {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, tenantId, ownerId },
      select: { id: true },
    })

    if (!order) return null

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        ownerId,
        orderId: dto.orderId,
        type: dto.type,
        invoiceNo: this.generateInvoiceNo(dto.type),
        pdfUrl: dto.pdfUrl,
      },
      include: { order: true },
    })

    return invoice as unknown as Record<string, unknown>
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
