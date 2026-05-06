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

type CatalogVariant = {
  sku?: string
  name?: string
}

type CatalogProduct = {
  name?: string
  variants?: CatalogVariant[]
}

type CityLookup = {
  city: string
  state: string
  postcode: string
}

const CITY_LOOKUP: Record<string, CityLookup> = {
  kajang: { city: 'Kajang', state: 'Selangor', postcode: '43000' },
  bangi: { city: 'Bangi', state: 'Selangor', postcode: '43650' },
  shahalam: { city: 'Shah Alam', state: 'Selangor', postcode: '40000' },
  klang: { city: 'Klang', state: 'Selangor', postcode: '41000' },
  subangjaya: { city: 'Subang Jaya', state: 'Selangor', postcode: '47500' },
  puchong: { city: 'Puchong', state: 'Selangor', postcode: '47100' },
  petalingjaya: { city: 'Petaling Jaya', state: 'Selangor', postcode: '46000' },
  ampang: { city: 'Ampang', state: 'Selangor', postcode: '68000' },
  rawang: { city: 'Rawang', state: 'Selangor', postcode: '48000' },
  kualalumpur: { city: 'Kuala Lumpur', state: 'Kuala Lumpur', postcode: '50000' },
  putrajaya: { city: 'Putrajaya', state: 'Putrajaya', postcode: '62000' },
  seremban: { city: 'Seremban', state: 'Negeri Sembilan', postcode: '70000' },
  johorbahru: { city: 'Johor Bahru', state: 'Johor', postcode: '80000' },
  batupahat: { city: 'Batu Pahat', state: 'Johor', postcode: '83000' },
  muar: { city: 'Muar', state: 'Johor', postcode: '84000' },
  melaka: { city: 'Melaka', state: 'Melaka', postcode: '75000' },
  alorsetar: { city: 'Alor Setar', state: 'Kedah', postcode: '05000' },
  sungaipetani: { city: 'Sungai Petani', state: 'Kedah', postcode: '08000' },
  ipoh: { city: 'Ipoh', state: 'Perak', postcode: '30000' },
  taiping: { city: 'Taiping', state: 'Perak', postcode: '34000' },
  kangar: { city: 'Kangar', state: 'Perlis', postcode: '01000' },
  kotabharu: { city: 'Kota Bharu', state: 'Kelantan', postcode: '15000' },
  kualaterengganu: { city: 'Kuala Terengganu', state: 'Terengganu', postcode: '20000' },
  kuantan: { city: 'Kuantan', state: 'Pahang', postcode: '25000' },
  georgetown: { city: 'George Town', state: 'Pulau Pinang', postcode: '10000' },
  butterworth: { city: 'Butterworth', state: 'Pulau Pinang', postcode: '12000' },
  kotakinabalu: { city: 'Kota Kinabalu', state: 'Sabah', postcode: '88000' },
  kuching: { city: 'Kuching', state: 'Sarawak', postcode: '93000' },
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

function sanitizeCatalog(input: unknown): CatalogProduct[] {
  if (!Array.isArray(input)) return []

  return input
    .slice(0, 300)
    .map((entry) => {
      const product = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {}
      const variantsRaw = Array.isArray(product.variants) ? product.variants : []
      const variants: CatalogVariant[] = variantsRaw
        .slice(0, 50)
        .map((v) => {
          const row = (v && typeof v === 'object') ? v as Record<string, unknown> : {}
          return {
            sku: asTrimmedString(row.sku),
            name: asTrimmedString(row.name),
          }
        })
        .filter((v) => v.sku || v.name)

      return {
        name: asTrimmedString(product.name),
        variants,
      }
    })
    .filter((p) => p.name || (p.variants && p.variants.length > 0))
}

function normalizeCityKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function stateFromPostcode(postcode?: string): string | undefined {
  const digits = String(postcode ?? '').replace(/\D/g, '')
  if (digits.length < 2) return undefined

  const prefix = Number(digits.slice(0, 2))
  if (Number.isNaN(prefix)) return undefined

  if (prefix >= 1 && prefix <= 2) return 'Johor'
  if (prefix >= 5 && prefix <= 9) return 'Kedah'
  if (prefix >= 10 && prefix <= 19) return 'Kelantan'
  if (prefix >= 20 && prefix <= 24) return 'Terengganu'
  if (prefix >= 25 && prefix <= 28) return 'Pahang'
  if (prefix >= 30 && prefix <= 36) return 'Perak'
  if (prefix >= 39 && prefix <= 49) return 'Selangor'
  if (prefix >= 50 && prefix <= 60) return 'Kuala Lumpur'
  if (prefix >= 62 && prefix <= 64) return 'Putrajaya'
  if (prefix >= 68 && prefix <= 68) return 'Selangor'
  if (prefix >= 70 && prefix <= 73) return 'Negeri Sembilan'
  if (prefix >= 75 && prefix <= 78) return 'Melaka'
  if (prefix >= 79 && prefix <= 86) return 'Johor'
  if (prefix >= 88 && prefix <= 91) return 'Sabah'
  if (prefix >= 93 && prefix <= 98) return 'Sarawak'

  if (digits.startsWith('00')) return 'Perlis'
  return undefined
}

function detectCityFromAddress(data: ParsedOrder): CityLookup | undefined {
  const combined = [data.city, data.addressLine1, data.addressLine2]
    .filter(Boolean)
    .join(' ')

  if (!combined.trim()) return undefined

  const normalizedText = normalizeCityKey(combined)
  for (const [key, value] of Object.entries(CITY_LOOKUP)) {
    if (normalizedText.includes(key)) {
      return value
    }
  }

  return undefined
}

function enrichAddress(data: ParsedOrder): ParsedOrder {
  const next: ParsedOrder = { ...data }

  const normalizedPostcode = String(next.postcode ?? '').replace(/\D/g, '').slice(0, 5)
  if (normalizedPostcode) next.postcode = normalizedPostcode

  let state = asTrimmedString(next.state)
  const city = asTrimmedString(next.city)
  let postcode = asTrimmedString(next.postcode)

  if (!state && postcode) {
    state = stateFromPostcode(postcode)
  }

  const cityHit = city ? CITY_LOOKUP[normalizeCityKey(city)] : undefined
  const detectedCity = cityHit ?? detectCityFromAddress(next)

  if (!city && detectedCity) {
    next.city = detectedCity.city
  }

  if (!state && detectedCity) {
    state = detectedCity.state
  }

  if (!postcode && detectedCity) {
    postcode = detectedCity.postcode
  }

  if (state) next.state = state
  if (postcode) next.postcode = postcode

  return next
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      input?: string
      productCatalog?: unknown
    }
    const input = String(body.input ?? '').trim()
    const productCatalog = sanitizeCatalog(body.productCatalog)

    if (!input) {
      return NextResponse.json({ error: 'Input is required.' }, { status: 400 })
    }

    if (input.length > 10000) {
      return NextResponse.json({ error: 'Input is too long (max 10000 chars).' }, { status: 400 })
    }

    const baseUrl = process.env.LOCAL_AI_BASE_URL || 'http://127.0.0.1:11434'
    const model = process.env.LOCAL_AI_MODEL || 'qwen2.5:7b'
    const timeoutMs = Number(process.env.LOCAL_AI_TIMEOUT_MS || '20000')

    const promptParts = [
      'You are an extraction assistant for a commerce order form.',
      'Extract fields from free text into STRICT JSON only.',
      'Do not include markdown, code fences, or explanations.',
      'If AVAILABLE_CATALOG is provided, prefer matching products/variants from that list.',
      'When matched, output SKU, productName, and variationName exactly as listed in AVAILABLE_CATALOG.',
      'Do not invent SKU values that are not in AVAILABLE_CATALOG.',
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
      '',
      `ORDER_TEXT:\n${input}`,
    ]

    if (productCatalog.length > 0) {
      promptParts.push(`AVAILABLE_CATALOG:\n${JSON.stringify(productCatalog)}`)
    }

    const aiRes = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: promptParts.join('\n'),
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    const aiJson = await aiRes.json().catch(() => ({})) as {
      error?: string
      response?: string
    }

    if (!aiRes.ok) {
      const msg = aiJson.error || 'Local AI extraction request failed.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const rawContent = aiJson.response
    if (!rawContent) {
      return NextResponse.json({ error: 'AI response is empty.' }, { status: 502 })
    }

    const parsed = JSON.parse(extractJsonObject(rawContent))
    const data = enrichAddress(sanitizeOrder(parsed))

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
