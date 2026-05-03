import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as crypto from 'crypto'

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget: dispatch event to all active webhooks for the tenant
   * that are subscribed to this event. Does not await delivery.
   */
  dispatch(tenantId: string, event: string, data: Record<string, unknown>): void {
    this.deliverAll(tenantId, event, data).catch((err) =>
      this.logger.error(`Webhook dispatch error [${event}]: ${err?.message}`),
    )
  }

  private async deliverAll(
    tenantId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: { tenantId, isActive: true },
    })

    const subscribed = webhooks.filter((w) => {
      const events = Array.isArray(w.events)
        ? (w.events as string[])
        : JSON.parse((w.events as unknown as string) ?? '[]')
      return events.includes(event)
    })

    await Promise.allSettled(subscribed.map((w) => this.deliver(w, event, data)))
  }

  private async deliver(
    webhook: { id: string; url: string; secret: string | null },
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      webhookId: webhook.id,
      data,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'emas-webhook/1.0',
      'X-Webhook-Event': event,
    }

    if (webhook.secret) {
      const sig = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${sig}`
    }

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(10000),
      })
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() },
      })
      if (!res.ok) {
        this.logger.warn(`Webhook ${webhook.id} responded ${res.status} for event [${event}]`)
      }
    } catch (err: unknown) {
      this.logger.error(`Webhook ${webhook.id} delivery failed [${event}]: ${(err as Error).message}`)
    }
  }
}
