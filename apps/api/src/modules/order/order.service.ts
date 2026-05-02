import { Injectable } from '@nestjs/common'
import type { Prisma } from '@emas/db'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateOrderDto,
  ListOrderQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/order.dto'

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, ownerId: string, query: ListOrderQueryDto): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ownerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNo: { contains: query.search } },
              { customerName: { contains: query.search } },
              { customerPhone: { contains: query.search } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
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
    return this.prisma.order.findFirst({
      where: { id, tenantId, ownerId },
      include: { items: true, shipment: true, payments: true, invoices: true },
    }) as Promise<Record<string, unknown> | null>
  }

  async create(tenantId: string, ownerId: string, dto: CreateOrderDto): Promise<Record<string, unknown>> {
    const shippingFee = this.asMoney(dto.shippingFee ?? 0)
    const discount = this.asMoney(dto.discount ?? 0)

    const preparedItems = dto.items.map((item) => {
      const unitPrice = this.asMoney(item.unitPrice)
      const totalPrice = this.asMoney(item.quantity * item.unitPrice)
      return {
        ...item,
        unitPrice,
        totalPrice,
      }
    })

    const subtotal = this.asMoney(
      preparedItems.reduce((sum, item) => sum + Number(item.totalPrice), 0),
    )
    const total = this.asMoney(Number(subtotal) + Number(shippingFee) - Number(discount))

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        ownerId,
        orderNo: dto.orderNo ?? this.generateOrderNo(),
        brandId: dto.brandId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
        notes: dto.notes,
        subtotal,
        shippingFee,
        discount,
        total,
        items: {
          create: preparedItems,
        },
      },
      include: { items: true },
    })

    return order as unknown as Record<string, unknown>
  }

  async updateStatus(
    tenantId: string,
    ownerId: string,
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Record<string, unknown> | null> {
    const existing = await this.prisma.order.findFirst({ where: { id, tenantId, ownerId } })
    if (!existing) return null

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    })

    return updated as unknown as Record<string, unknown>
  }

  async updatePaymentStatus(
    tenantId: string,
    ownerId: string,
    id: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<Record<string, unknown> | null> {
    const existing = await this.prisma.order.findFirst({ where: { id, tenantId, ownerId } })
    if (!existing) return null

    const updated = await this.prisma.order.update({
      where: { id },
      data: { paymentStatus: dto.paymentStatus },
      include: { items: true },
    })

    return updated as unknown as Record<string, unknown>
  }

  private generateOrderNo(): string {
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d = String(now.getUTCDate()).padStart(2, '0')
    const h = String(now.getUTCHours()).padStart(2, '0')
    const i = String(now.getUTCMinutes()).padStart(2, '0')
    const s = String(now.getUTCSeconds()).padStart(2, '0')
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `ORD-${y}${m}${d}-${h}${i}${s}-${rand}`
  }

  private asMoney(value: number): string {
    return Number(value).toFixed(2)
  }
}
