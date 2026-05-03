import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto } from './dto/webhook.dto'
import * as crypto from 'crypto'

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return webhooks.map((w) => ({
      ...w,
      events: Array.isArray(w.events) ? w.events : JSON.parse(w.events as string ?? '[]'),
    }))
  }

  async create(tenantId: string, dto: CreateWebhookDto) {
    const webhook = await this.prisma.webhook.create({
      data: {
        tenantId,
        name: dto.name,
        url: dto.url,
        secret: dto.secret ?? null,
        events: dto.events,
        isActive: dto.isActive ?? true,
      },
    })
    return {
      ...webhook,
      events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events as string ?? '[]'),
    }
  }

  async update(tenantId: string, id: string, dto: UpdateWebhookDto) {
    await this.findOne(tenantId, id)
    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.events !== undefined && { events: dto.events }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
    return {
      ...webhook,
      events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events as string ?? '[]'),
    }
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    await this.prisma.webhook.delete({ where: { id } })
    return { success: true }
  }

  async toggle(tenantId: string, id: string) {
    const webhook = await this.findOne(tenantId, id)
    const updated = await this.prisma.webhook.update({
      where: { id },
      data: { isActive: !webhook.isActive },
    })
    return {
      ...updated,
      events: Array.isArray(updated.events) ? updated.events : JSON.parse(updated.events as string ?? '[]'),
    }
  }

  private async findOne(tenantId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, tenantId } })
    if (!webhook) throw new NotFoundException('Webhook not found')
    return webhook
  }

  async test(tenantId: string, id: string, dto: TestWebhookDto): Promise<{ success: boolean; status?: number; error?: string }> {
    const webhook = await this.findOne(tenantId, id)
    const payload = JSON.stringify({
      event: dto.event,
      timestamp: new Date().toISOString(),
      webhookId: id,
      test: true,
      data: this.buildSampleData(dto.event),
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'emas-webhook/1.0',
      'X-Webhook-Event': dto.event,
    }

    if (webhook.secret) {
      const sig = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${sig}`
    }

    try {
      const res = await fetch(webhook.url, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(10000) })
      await this.prisma.webhook.update({ where: { id }, data: { lastTriggeredAt: new Date() } })
      return { success: res.ok, status: res.status }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  private buildSampleData(event: string): Record<string, unknown> {
    const sampleOrder = {
      id: 'ord_sample_abc123',
      orderNo: 'ORD-20260503-143000-ABCD',
      status: 'pending',
      paymentStatus: 'unpaid',
      customerName: 'Ahmad Bin Ali',
      customerPhone: '60123456789',
      customerEmail: 'ahmad@example.com',
      subtotal: '150.00',
      shippingFee: '10.00',
      discount: '0.00',
      total: '160.00',
      notes: 'Sila hantar sebelum 5 petang',
      shippingAddress: {
        name: 'Ahmad Bin Ali',
        phone: '60123456789',
        line1: 'No 12, Jalan Kenanga 1',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state: 'Kuala Lumpur',
        country: 'MY',
      },
      items: [
        {
          id: 'item_sample_001',
          productName: 'Stiker Vinyl A4',
          sku: 'STK-A4-VNL',
          quantity: 3,
          unitPrice: '50.00',
          totalPrice: '150.00',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    switch (event) {
      case 'order.created':
        return sampleOrder
      case 'order.updated':
        return { ...sampleOrder, status: 'processing', previousPaymentStatus: 'unpaid', paymentStatus: 'paid' }
      case 'order.status_changed':
        return { ...sampleOrder, status: 'processing', previousStatus: 'pending' }
      case 'order.completed':
        return { ...sampleOrder, status: 'completed' }
      case 'order.cancelled':
        return { ...sampleOrder, status: 'cancelled' }
      case 'payment.received':
        return {
          id: 'pay_sample_xyz789',
          orderId: sampleOrder.id,
          orderNo: sampleOrder.orderNo,
          amount: '160.00',
          method: 'online_banking',
          reference: 'FPX20260503143000',
          paidAt: new Date().toISOString(),
        }
      case 'payment.failed':
        return {
          id: 'pay_sample_xyz789',
          orderId: sampleOrder.id,
          orderNo: sampleOrder.orderNo,
          amount: '160.00',
          method: 'online_banking',
          reason: 'Insufficient funds',
          failedAt: new Date().toISOString(),
        }
      case 'shipment.created':
        return {
          id: 'shp_sample_def456',
          orderId: sampleOrder.id,
          orderNo: sampleOrder.orderNo,
          courier: 'J&T Express',
          trackingNo: 'JT1234567890MY',
          status: 'booked',
          createdAt: new Date().toISOString(),
        }
      case 'shipment.updated':
        return {
          id: 'shp_sample_def456',
          orderId: sampleOrder.id,
          orderNo: sampleOrder.orderNo,
          courier: 'J&T Express',
          trackingNo: 'JT1234567890MY',
          status: 'in_transit',
          updatedAt: new Date().toISOString(),
        }
      case 'shipment.delivered':
        return {
          id: 'shp_sample_def456',
          orderId: sampleOrder.id,
          orderNo: sampleOrder.orderNo,
          courier: 'J&T Express',
          trackingNo: 'JT1234567890MY',
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
        }
      case 'customer.created':
        return {
          id: 'cust_sample_ghi012',
          name: 'Ahmad Bin Ali',
          phone: '60123456789',
          email: 'ahmad@example.com',
          totalOrders: 1,
          totalSpent: '160.00',
          createdAt: new Date().toISOString(),
        }
      default:
        return { message: `Sample payload for event: ${event}` }
    }
  }
}
