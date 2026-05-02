import type { Processor } from 'bullmq'

export interface ShippingJob {
  tenantId: string
  orderId: string
  action: 'create_awb' | 'track' | 'bulk_awb'
}

export const shippingProcessor: Processor<ShippingJob> = async (job) => {
  const { tenantId, orderId, action } = job.data
  // TODO: call courier integration service
  console.log(`[shipping] tenant=${tenantId} order=${orderId} action=${action}`)
}
