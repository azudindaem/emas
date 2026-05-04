export type SmsProvider = 'adasms' | 'smsniaga'

export interface SmsConfig {
  provider: SmsProvider
  apiKey: string
  apiPassword?: string // SMS Niaga uses apiId + apiPassword
  senderId: string
}

/**
 * AdaSMS — https://adasms.com
 * POST https://adasms.com/api/v1/message
 * Authorization: Bearer {apiKey}
 */
async function sendViaAdasms(config: SmsConfig, to: string, message: string): Promise<void> {
  const res = await fetch('https://adasms.com/api/v1/message', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: to,
      message,
      sender_id: config.senderId,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`AdaSMS error ${res.status}: ${body}`)
  }
}

/**
 * SMS Niaga — https://www.smsniaga.com
 * POST https://www.smsniaga.com/sending/api
 * form-urlencoded
 */
async function sendViaSmsNiaga(config: SmsConfig, to: string, message: string): Promise<void> {
  const params = new URLSearchParams({
    apiid: config.apiKey,
    apipassword: config.apiPassword ?? '',
    senderid: config.senderId,
    format: '1',
    recipient: to,
    message,
  })

  const res = await fetch('https://www.smsniaga.com/sending/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SMS Niaga error ${res.status}: ${body}`)
  }
}

export async function sendSms(config: SmsConfig, to: string, message: string): Promise<void> {
  if (config.provider === 'adasms') {
    await sendViaAdasms(config, to, message)
  } else if (config.provider === 'smsniaga') {
    await sendViaSmsNiaga(config, to, message)
  } else {
    throw new Error(`Unknown SMS provider: ${config.provider}`)
  }
}
