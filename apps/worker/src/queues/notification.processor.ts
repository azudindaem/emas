import type { Processor } from 'bullmq'

export interface NotificationJob {
  tenantId: string
  channel: 'email' | 'sms' | 'whatsapp'
  recipient: string
  templateId: string
  variables: Record<string, string>
}

export const notificationProcessor: Processor<NotificationJob> = async (job) => {
  const { tenantId, channel, recipient, templateId, variables } = job.data
  // TODO: implement channel-specific sending
  console.log(`[notification] tenant=${tenantId} channel=${channel} to=${recipient} template=${templateId}`, variables)
}
