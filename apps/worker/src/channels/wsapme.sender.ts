export interface WsapmeConfig {
  apiUrl: string   // e.g. https://app.wsapme.com/api/send
  token: string
  senderId?: string
}

/**
 * Wsapme — WhatsApp Unofficial API
 * POST {apiUrl}
 * Body: { token, to, message }
 */
export async function sendWsapme(
  config: WsapmeConfig,
  to: string,
  message: string,
): Promise<void> {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: config.token,
      to,
      message,
      ...(config.senderId ? { sender_id: config.senderId } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Wsapme error ${res.status}: ${body}`)
  }
}
