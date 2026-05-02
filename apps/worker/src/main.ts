import { Worker } from 'bullmq'
import { redisConnection } from './lib/redis'
import { notificationProcessor } from './queues/notification.processor'
import { invoiceProcessor } from './queues/invoice.processor'
import { shippingProcessor } from './queues/shipping.processor'
import { commissionProcessor } from './queues/commission.processor'

function createWorker(queueName: string, processor: Parameters<typeof Worker>[1]) {
  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency: 5,
  })

  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[${queueName}] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

createWorker('notification', notificationProcessor)
createWorker('invoice', invoiceProcessor)
createWorker('shipping', shippingProcessor)
createWorker('commission', commissionProcessor)

console.log('emas.my worker started')
