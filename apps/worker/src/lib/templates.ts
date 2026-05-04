/**
 * Simple template renderer.
 * Replaces {{key}} with values from variables.
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

/**
 * Built-in message templates by templateId.
 * Returns a plain-text message string.
 */
export function resolveTemplate(templateId: string, variables: Record<string, string>): string {
  const templates: Record<string, string> = {
    'order.created': 'Pesanan {{orderId}} telah diterima. Terima kasih {{customerName}}!',
    'order.status_changed': 'Status pesanan {{orderId}} dikemaskini kepada {{status}}.',
    'order.completed': 'Pesanan {{orderId}} telah selesai. Terima kasih kerana membeli-belah bersama kami!',
    'order.cancelled': 'Pesanan {{orderId}} telah dibatalkan.',
    'payment.received': 'Pembayaran RM{{amount}} untuk pesanan {{orderId}} telah diterima.',
    'payment.failed': 'Pembayaran untuk pesanan {{orderId}} gagal. Sila cuba semula.',
    'shipment.created': 'Pesanan {{orderId}} telah dihantar. No. Pengesanan: {{trackingNumber}}.',
    'shipment.delivered': 'Pesanan {{orderId}} telah dihantar ke destinasi.',
    custom: '{{message}}',
  }

  const template = templates[templateId] ?? templates['custom']
  return renderTemplate(template, variables)
}
