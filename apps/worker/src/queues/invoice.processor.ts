import type { Processor } from 'bullmq'

export interface InvoiceJob {
  tenantId: string
  orderId: string
  type: 'seller' | 'customer' | 'delivery_note'
}

export const invoiceProcessor: Processor<InvoiceJob> = async (job) => {
  const { tenantId, orderId, type } = job.data
  // TODO: generate PDF invoice via puppeteer/pdfmake
  console.log(`[invoice] tenant=${tenantId} order=${orderId} type=${type}`)
}
