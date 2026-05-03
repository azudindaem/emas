import { Injectable } from '@nestjs/common'
import type { Prisma } from '@emas/db'
import { PrismaService } from '../prisma/prisma.service'
import { WebhookDispatcherService } from '../webhook/webhook-dispatcher.service'
import {
  CreateOrderDto,
  ListOrderQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  OrderStatusDto,
} from './dto/order.dto'

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

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

  async create(
    tenantId: string,
    ownerId: string,
    createdById: string,
    dto: CreateOrderDto,
  ): Promise<Record<string, unknown>> {
    const shippingFee = this.asMoney(dto.shippingFee ?? 0)
    const discount = this.asMoney(dto.discount ?? 0)
    const customerPhone = String(dto.customerPhone ?? '').trim()
    const customerName = String(dto.customerName ?? '').trim()

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

    const shippingAddress = dto.shippingAddress as Prisma.InputJsonValue

    const order = await this.prisma.$transaction(async (tx) => {
      let customerId = dto.customerId

      if (!customerId && customerPhone) {
        const existingCustomer = await tx.customer.findUnique({
          where: { tenantId_phone: { tenantId, phone: customerPhone } },
        })

        if (existingCustomer) {
          const updatedCustomer = await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: customerName,
              email: dto.customerEmail,
              address: shippingAddress,
              totalOrders: { increment: 1 },
              totalSpent: { increment: Number(total) },
            },
          })
          customerId = updatedCustomer.id
        } else {
          const createdCustomer = await tx.customer.create({
            data: {
              tenantId,
              name: customerName,
              phone: customerPhone,
              email: dto.customerEmail,
              address: shippingAddress,
              totalOrders: 1,
              totalSpent: Number(total),
            },
          })
          customerId = createdCustomer.id
        }
      }

      return tx.order.create({
        data: {
          tenantId,
          ownerId,
          createdById,
          orderNo: dto.orderNo ?? this.generateOrderNo(),
          brandId: dto.brandId,
          customerId,
          customerName,
          customerPhone,
          customerEmail: dto.customerEmail,
          shippingAddress,
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
    })

    const result = order as unknown as Record<string, unknown>
    this.webhookDispatcher.dispatch(tenantId, 'order.created', this.serializeOrder(result))
    return result
  }

  private serializeOrder(order: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(order))
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

    const result = updated as unknown as Record<string, unknown>
    this.webhookDispatcher.dispatch(tenantId, 'order.status_changed', {
      ...this.serializeOrder(result),
      previousStatus: existing.status,
    })
    if (dto.status === OrderStatusDto.DELIVERED) {
      this.webhookDispatcher.dispatch(tenantId, 'order.completed', this.serializeOrder(result))
    }
    if (dto.status === OrderStatusDto.CANCELLED) {
      this.webhookDispatcher.dispatch(tenantId, 'order.cancelled', this.serializeOrder(result))
    }

    return result
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

    const result = updated as unknown as Record<string, unknown>
    this.webhookDispatcher.dispatch(tenantId, 'order.updated', {
      ...this.serializeOrder(result),
      previousPaymentStatus: existing.paymentStatus,
    })

    return result
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
