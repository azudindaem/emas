import type { Processor } from 'bullmq'
import { getPrisma } from '../lib/db'
import { resolveTemplate } from '../lib/templates'
import { sendEmail, type EmailConfig } from '../channels/email.sender'
import { sendSms, type SmsConfig } from '../channels/sms.sender'
import { sendWsapme, type WsapmeConfig } from '../channels/wsapme.sender'

export interface NotificationJob {
  tenantId: string
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP_UNOFFICIAL'
  recipient: string
  templateId: string
  subject?: string
  variables: Record<string, string>
}

export const notificationProcessor: Processor<NotificationJob> = async (job) => {
  const { tenantId, channel, recipient, templateId, subject, variables } = job.data
  const prisma = getPrisma()

  // Fetch tenant notification config for this channel
  const config = await prisma.notificationConfig.findUnique({
    where: { tenantId_channel: { tenantId, channel } },
  })

  if (!config || !config.isActive) {
    console.log(`[notification] channel=${channel} not configured or disabled for tenant=${tenantId}`)
    return
  }

  const settings = config.settings as Record<string, unknown>
  const message = resolveTemplate(templateId, variables)

  try {
    if (channel === 'EMAIL') {
      await sendEmail(settings as unknown as EmailConfig, recipient, subject ?? 'Notifikasi', message)
      console.log(`[notification] EMAIL sent to ${recipient} (tenant=${tenantId})`)
    } else if (channel === 'SMS') {
      await sendSms(settings as unknown as SmsConfig, recipient, message)
      console.log(`[notification] SMS sent to ${recipient} via ${(settings as unknown as SmsConfig).provider} (tenant=${tenantId})`)
    } else if (channel === 'WHATSAPP_UNOFFICIAL') {
      await sendWsapme(settings as unknown as WsapmeConfig, recipient, message)
      console.log(`[notification] Wsapme sent to ${recipient} device=${(settings as unknown as WsapmeConfig).deviceId} (tenant=${tenantId})`)
    } else {
      console.warn(`[notification] Unknown channel=${channel}, skipping`)
    }
  } catch (err) {
    console.error(`[notification] Failed channel=${channel} to=${recipient}:`, err)
    throw err // re-throw so BullMQ retries
  }
}
