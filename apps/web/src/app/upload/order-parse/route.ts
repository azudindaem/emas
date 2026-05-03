import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ParsedItem = {
  sku?: string
  productName?: string
  variationName?: string
  quantity?: number
  unitPrice?: number
}

type ParsedOrder = {
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  addressLine1?: string
  addressLine2?: string
  postcode?: string
  city?: string
  state?: string
  country?: string
  shippingFee?: number
  discount?: number
  privateNote?: string
  awbNote?: string
  paymentMethod?: string
  shippingMethod?: string
  items?: ParsedItem[]
}

function extractJsonObject(raw: string): string {
  const text = raw.trim()
  if (text.startsWith('{') && text.endsWith('}')) return text

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) return text.slice(first, last + 1)

  throw new Error('No JSON object found in model response')
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return undefined
}

function sanitizeOrder(input: unknown): ParsedOrder {
  const data = (input && typeof input === 'object') ? input as Record<string, unknown> : {}

  const itemsRaw = Array.isArray(data.items) ? data.items : []
  const items: ParsedItem[] = itemsRaw
    .slice(0, 50)
    .map((entry) => {
      const row = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {}
      return {
        sku: asTrimmedString(row.sku),
        productName: asTrimmedString(row.productName),
        variationName: asTrimmedString(row.variationName),
        quantity: asPositiveNumber(row.quantity),
        unitPrice: asPositiveNumber(row.unitPrice),
      }
    })
    .filter((row) => row.sku || row.productName || row.variationName)

  return {
    customerName: asTrimmedString(data.customerName),
    customerPhone: asTrimmedString(data.customerPhone),
    customerEmail: asTrimmedString(data.customerEmail),
    addressLine1: asTrimmedString(data.addressLine1),
    addressLine2: asTrimmedString(data.addressLine2),
    postcode: asTrimmedString(data.postcode),
    city: asTrimmedString(data.city),
    state: asTrimmedString(data.state),
    country: asTrimmedString(data.country),
    shippingFee: asPositiveNumber(data.shippingFee),
    discount: asPositiveNumber(data.discount),
    privateNote: asTrimmedString(data.privateNote),
    awbNote: asTrimmedString(data.awbNote),
    paymentMethod: asTrimmedString(data.paymentMethod),
    shippingMethod: asTrimmedString(data.shippingMethod),
    items,
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    if (!key) {
      return NextResponse.json({ error: 'OpenAI API key is missing in environment.' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({})) as { input?: string }
    const input = String(body.input ?? '').trim()

    if (!input) {
      return NextResponse.json({ error: 'Input is required.' }, { status: 400 })
    }

    if (input.length > 10000) {
      return NextResponse.json({ error: 'Input is too long (max 10000 chars).' }, { status: 400 })
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const systemPrompt = [
      'You are an extraction assistant for a commerce order form.',
      'Extract fields from free text into STRICT JSON only.',
      'Do not include markdown, code fences, or explanations.',
      'Use these keys exactly:',
      '{',
      '  "customerName": string?,',
      '  "customerPhone": string?,',
      '  "customerEmail": string?,',
      '  "addressLine1": string?,',
      '  "addressLine2": string?,',
      '  "postcode": string?,',
      '  "city": string?,',
      '  "state": string?,',
      '  "country": string?,',
      '  "shippingFee": number?,',
      '  "discount": number?,',
      '  "privateNote": string?,',
      '  "awbNote": string?,',
      '  "paymentMethod": "COD"|"BANK_TRANSFER"|"FOC"|""?',
      '  "shippingMethod": "NINJA_VAN"|"SELF_PICKUP"|""?',
      '  "items": [',
      '    {',
      '      "sku": string?,',
      '      "productName": string?,',
      '      "variationName": string?,',
      '      "quantity": number?,',
      '      "unitPrice": number?',
      '    }',
      '  ]?',
      '}',
      'If a field is unknown, omit it.',
      'Normalize payment/shipping values to the enums above when possible.',
    ].join('\n')

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
      }),
    })

    const aiJson = await aiRes.json().catch(() => ({})) as {
      error?: { message?: string }
      choices?: Array<{ message?: { content?: string } }>
    }

    if (!aiRes.ok) {
      const msg = aiJson.error?.message || 'AI extraction request failed.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const rawContent = aiJson.choices?.[0]?.message?.content
    if (!rawContent) {
      return NextResponse.json({ error: 'AI response is empty.' }, { status: 502 })
    }

    const parsed = JSON.parse(extractJsonObject(rawContent))
    const data = sanitizeOrder(parsed)

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
