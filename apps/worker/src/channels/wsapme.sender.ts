export interface WsapmeConfig {
  apiUrl: string   // e.g. https://api.wsapme.com/v1/sendMessage
  userToken: string
  deviceId: number
}

/**
 * Wsapme — WhatsApp Unofficial API
 * POST {apiUrl}
 * Header: x-wsapme-token: {userToken}
 * Body: { device, to, message, priority, data, time }
 */
export async function sendWsapme(
  config: WsapmeConfig,
  to: string,
  message: string,
): Promise<void> {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wsapme-token': config.userToken,
    },
    body: JSON.stringify({
      device: Number(config.deviceId),
      to,
      message,
      priority: 1,
      data: '',
      time: 0,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Wsapme error ${res.status}: ${body}`)
  }
}
