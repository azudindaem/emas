import type { Processor } from 'bullmq'

export interface CommissionJob {
  tenantId: string
  orderId: string
  type: 'sales' | 'recruitment' | 'channel' | 'network' | 'point' | 'same_level'
}

export const commissionProcessor: Processor<CommissionJob> = async (job) => {
  const { tenantId, orderId, type } = job.data
  // TODO: run commission calculation engine
  console.log(`[commission] tenant=${tenantId} order=${orderId} type=${type}`)
}
