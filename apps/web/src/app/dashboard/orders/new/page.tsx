'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bot,
  CreditCard,
  Globe,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Truck,
  User,
} from 'lucide-react'
import { parsePhoneNumber } from 'libphonenumber-js'
import { orders as ordersApi, products as productsApi } from '@/lib/api'
import { useLocale } from '@/lib/locale'

interface OrderSearchResult {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  shippingAddress?: {
    line1?: string
    line2?: string
    postcode?: string
    city?: string
    state?: string
    country?: string
  }
}

/** Normalize phone to E.164 without leading +, defaulting to MY.
 *  Examples: 0123456789 → 60123456789, +60123456789 → 60123456789 */
function normalizePhone(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  try {
    // parsePhoneNumber requires a + prefix or a default country
    const parsed = parsePhoneNumber(trimmed, 'MY')
    if (parsed?.isValid()) {
      // E.164 gives +60..., strip the leading +
      return parsed.format('E.164').replace(/^\+/, '')
    }
  } catch {
    // fall through — return cleaned digits only
  }
  // Fallback: strip non-digits, prefix 60 if starts with 0
  const digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('0')) return '6' + digits
  return digits
}

interface Variation {
  id: string
  sku: string
  name: string
  price: string | number
}

interface Product {
  id: string
  name: string
  variations: Variation[]
}

interface SelectedItem {
  id: string
  productId: string
  variationId: string
  productName: string
  variationName: string
  sku: string
  unitPrice: number
  quantity: number
}

interface AIPasteItem {
  sku?: string
  productName?: string
  variationName?: string
  quantity?: number
  unitPrice?: number
}

interface AIPasteResult {
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
  items?: AIPasteItem[]
}

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
const LABEL = 'block text-xs font-medium text-gray-700 mb-1.5'
const CARD = 'rounded-lg p-4 bg-white border border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]'

const money = (value: number) => Number(value || 0).toFixed(2)

export default function CreateOrderPage() {
  const router = useRouter()
  const { t } = useLocale()
  const c = t.orders.create

  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [searchMode, setSearchMode] = useState<'phone' | 'orderId'>('phone')
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<OrderSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [orderForUserOpen, setOrderForUserOpen] = useState(true)
  const [customerInfoOpen, setCustomerInfoOpen] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aiPasteOpen, setAiPasteOpen] = useState(false)
  const [aiPasteInput, setAiPasteInput] = useState('')
  const [aiPasteLoading, setAiPasteLoading] = useState(false)
  const [aiPasteError, setAiPasteError] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [postcode, setPostcode] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [country, setCountry] = useState('Malaysia')

  const [shippingFee, setShippingFee] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [privateNoteOn, setPrivateNoteOn] = useState(false)
  const [awbNoteOn, setAwbNoteOn] = useState(false)
  const [privateNote, setPrivateNote] = useState('')
  const [awbNote, setAwbNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER' | 'FOC' | ''>('')
  const [shippingMethod, setShippingMethod] = useState<'NINJA_VAN' | 'SELF_PICKUP' | ''>('')

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariationId, setSelectedVariationId] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [items, setItems] = useState<SelectedItem[]>([])
  const [editSellingPrice, setEditSellingPrice] = useState(false)
  const [sellingPriceInput, setSellingPriceInput] = useState('0')

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const selectedVariation = useMemo(
    () => selectedProduct?.variations.find((v) => v.id === selectedVariationId) ?? null,
    [selectedProduct, selectedVariationId],
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  )

  const derivedTotal = useMemo(() => subtotal + Number(shippingFee || 0) - Number(discount || 0), [subtotal, shippingFee, discount])

  const total = useMemo(() => {
    if (!editSellingPrice) return derivedTotal
    return Number(sellingPriceInput || 0)
  }, [derivedTotal, editSellingPrice, sellingPriceInput])

  const fetchProductPool = async (): Promise<Product[]> => {
    const res = await productsApi.list({ page: 1, limit: 200 }) as { items?: Product[] }
    return (res.items ?? []).filter((p) => p.variations?.length > 0)
  }

  const normalizeMode = (value?: string): 'COD' | 'BANK_TRANSFER' | 'FOC' | '' => {
    const normalized = String(value ?? '').trim().toUpperCase()
    if (normalized === 'COD') return 'COD'
    if (normalized === 'BANK_TRANSFER' || normalized === 'BANK TRANSFER' || normalized === 'TRANSFER') return 'BANK_TRANSFER'
    if (normalized === 'FOC') return 'FOC'
    return ''
  }

  const normalizeShipping = (value?: string): 'NINJA_VAN' | 'SELF_PICKUP' | '' => {
    const normalized = String(value ?? '').trim().toUpperCase()
    if (normalized === 'NINJA_VAN' || normalized === 'NINJAVAN') return 'NINJA_VAN'
    if (normalized === 'SELF_PICKUP' || normalized === 'SELF PICKUP' || normalized === 'PICKUP') return 'SELF_PICKUP'
    return ''
  }

  const applyAIPaste = async () => {
    if (!aiPasteInput.trim()) {
      setAiPasteError(c.errors.aiPasteEmpty)
      return
    }

    setAiPasteLoading(true)
    setAiPasteError('')

    try {
      const res = await fetch('/upload/order-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: aiPasteInput }),
      })

      const payload = await res.json().catch(() => ({})) as { error?: string; data?: AIPasteResult }
      if (!res.ok || !payload.data) {
        throw new Error(payload.error || c.errors.aiPasteFailed)
      }

      const data = payload.data

      if (data.customerName) setCustomerName(data.customerName)
      if (data.customerPhone) setCustomerPhone(normalizePhone(data.customerPhone))
      if (data.customerEmail) setCustomerEmail(data.customerEmail)
      if (data.addressLine1) setAddressLine1(data.addressLine1)
      if (data.addressLine2) setAddressLine2(data.addressLine2)
      if (data.postcode) setPostcode(data.postcode)
      if (data.city) setCity(data.city)
      if (data.state) setStateName(data.state)
      if (data.country) setCountry(data.country)
      if (typeof data.shippingFee === 'number' && Number.isFinite(data.shippingFee)) setShippingFee(String(Math.max(0, data.shippingFee)))
      if (typeof data.discount === 'number' && Number.isFinite(data.discount)) setDiscount(String(Math.max(0, data.discount)))

      if (data.privateNote) {
        setPrivateNoteOn(true)
        setPrivateNote(data.privateNote)
      }
      if (data.awbNote) {
        setAwbNoteOn(true)
        setAwbNote(data.awbNote)
      }

      const parsedPayment = normalizeMode(data.paymentMethod)
      if (parsedPayment) setPaymentMethod(parsedPayment)
      const parsedShipping = normalizeShipping(data.shippingMethod)
      if (parsedShipping) setShippingMethod(parsedShipping)

      if (data.items?.length) {
        let productPool = products
        if (productPool.length === 0) {
          productPool = await fetchProductPool()
          setProducts(productPool)
        }

        const matchedItems: SelectedItem[] = []

        for (const parsedItem of data.items) {
          const rawSku = String(parsedItem.sku ?? '').trim().toLowerCase()
          const rawProduct = String(parsedItem.productName ?? '').trim().toLowerCase()
          const rawVariation = String(parsedItem.variationName ?? '').trim().toLowerCase()

          let foundProduct: Product | null = null
          let foundVariation: Variation | null = null

          if (rawSku) {
            for (const product of productPool) {
              const found = product.variations.find((v) => v.sku.toLowerCase() === rawSku)
              if (found) {
                foundProduct = product
                foundVariation = found
                break
              }
            }
          }

          if (!foundProduct || !foundVariation) {
            for (const product of productPool) {
              if (rawProduct && !product.name.toLowerCase().includes(rawProduct)) continue
              const found = product.variations.find((v) => !rawVariation || v.name.toLowerCase().includes(rawVariation))
              if (found) {
                foundProduct = product
                foundVariation = found
                break
              }
            }
          }

          if (!foundProduct || !foundVariation) continue

          const quantity = Math.max(1, Number(parsedItem.quantity || 1))
          const parsedPrice = Number(parsedItem.unitPrice)
          const unitPrice = Number.isFinite(parsedPrice) && parsedPrice > 0
            ? parsedPrice
            : Number(foundVariation.price || 0)

          matchedItems.push({
            id: `${foundProduct.id}-${foundVariation.id}`,
            productId: foundProduct.id,
            variationId: foundVariation.id,
            productName: foundProduct.name,
            variationName: foundVariation.name,
            sku: foundVariation.sku,
            unitPrice,
            quantity,
          })
        }

        if (matchedItems.length > 0) {
          setItems((prev) => {
            const next = [...prev]
            for (const item of matchedItems) {
              const existingIndex = next.findIndex((x) => x.variationId === item.variationId)
              if (existingIndex >= 0) {
                next[existingIndex] = {
                  ...next[existingIndex],
                  quantity: next[existingIndex].quantity + item.quantity,
                }
              } else {
                next.push(item)
              }
            }
            return next
          })
        } else {
          setError(c.errors.aiPasteNoItemMatched)
        }
      }

      setAiPasteOpen(false)
      setAiPasteInput('')
    } catch (e: unknown) {
      setAiPasteError(e instanceof Error ? e.message : c.errors.aiPasteFailed)
    } finally {
      setAiPasteLoading(false)
    }
  }

  const handleCustomerSearch = async () => {
    const q = searchText.trim()
    if (!q) return
    setSearchLoading(true)
    setSearchDone(false)
    setSearchResults([])
    try {
      const res = await ordersApi.list({ search: q, page: 1, limit: 10 }) as { items: OrderSearchResult[] }
      setSearchResults(res.items ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
      setSearchDone(true)
    }
  }

  const autofillFromOrder = (order: OrderSearchResult) => {
    setCustomerName(order.customerName ?? '')
    setCustomerPhone(order.customerPhone ? normalizePhone(order.customerPhone) : '')
    setCustomerEmail(order.customerEmail ?? '')
    const addr = order.shippingAddress
    if (addr) {
      setAddressLine1(addr.line1 ?? '')
      setAddressLine2(addr.line2 ?? '')
      setPostcode(addr.postcode ?? '')
      setCity(addr.city ?? '')
      setStateName(addr.state ?? '')
      setCountry(addr.country ?? 'Malaysia')
    }
    setSearchResults([])
    setSearchText('')
    setSearchDone(false)
    setCustomerInfoOpen(true)
  }

  const ensureProducts = async () => {
    if (products.length > 0 || loadingProducts) return
    setLoadingProducts(true)
    try {
      const pool = await fetchProductPool()
      setProducts(pool)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : c.errors.loadProducts)
    } finally {
      setLoadingProducts(false)
    }
  }

  const syncDiscountFromSellingPrice = (targetTotal: number) => {
    const base = subtotal + Number(shippingFee || 0)
    if (targetTotal > base) {
      setError(c.errors.sellingPriceTooHigh)
      return
    }
    const nextDiscount = Math.max(0, base - targetTotal)
    setDiscount(String(nextDiscount.toFixed(2)))
    setError('')
  }

  const addItem = () => {
    setError('')
    if (!selectedProduct || !selectedVariation) {
      setError(c.errors.pickProductVariation)
      return
    }
    const quantity = Math.max(1, Number(itemQty || 1))
    const existing = items.find((i) => i.variationId === selectedVariation.id)
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.variationId === selectedVariation.id ? { ...i, quantity: i.quantity + quantity } : i,
        ),
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `${selectedProduct.id}-${selectedVariation.id}`,
          productId: selectedProduct.id,
          variationId: selectedVariation.id,
          productName: selectedProduct.name,
          variationName: selectedVariation.name,
          sku: selectedVariation.sku,
          unitPrice: Number(selectedVariation.price || 0),
          quantity,
        },
      ])
    }
    setItemQty('1')
    setShowAddProduct(false)
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const updateQty = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
    )
  }

  const validate = () => {
    const normalizedPhone = normalizePhone(customerPhone)
    if (!customerName.trim() || !normalizedPhone) {
      setError(c.errors.requiredCustomer)
      return false
    }
    if (items.length === 0) {
      setError(c.errors.requiredItems)
      return false
    }
    if (!addressLine1.trim() || !postcode.trim() || !city.trim() || !stateName.trim()) {
      setError(c.errors.requiredAddress)
      return false
    }
    if (!paymentMethod) {
      setError(c.errors.requiredPaymentMethod)
      return false
    }
    if (!shippingMethod) {
      setError(c.errors.requiredShippingMethod)
      return false
    }
    setError('')
    return true
  }

  const submit = async () => {
    if (!validate()) return
    setSaving(true)
    setError('')
    try {
      const mergedNotes = [
        privateNoteOn && privateNote ? `[${c.noteTags.private}] ${privateNote}` : '',
        awbNoteOn && awbNote ? `[${c.noteTags.awb}] ${awbNote}` : '',
        `[${c.noteTags.payment}] ${paymentMethod}`,
        `[${c.noteTags.shipping}] ${shippingMethod}`,
      ].filter(Boolean).join('\n')

      await ordersApi.create({
        customerName,
        customerPhone: normalizePhone(customerPhone),
        customerEmail: customerEmail || undefined,
        shippingAddress: {
          line1: addressLine1,
          line2: addressLine2,
          postcode,
          city,
          state: stateName,
          country,
        },
        shippingFee: Number(shippingFee || 0),
        discount: Number(discount || 0),
        notes: mergedNotes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          variationId: item.variationId,
          sku: item.sku,
          name: `${item.productName} - ${item.variationName}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
      router.push('/dashboard/orders')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : c.errors.createFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="container mx-auto max-w-6xl p-4 pb-20 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900">
            <Link href="/dashboard/orders" className="mr-1 p-2 rounded-full transition-colors text-slate-500 hover:text-slate-900 hover:bg-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-medium">{c.title}</h1>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors text-slate-500 hover:text-slate-900 hover:bg-white">
            <span>{c.help}</span>
          </button>
        </div>

        <div className="flex rounded-xl p-1 gap-1.5 bg-white border border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`relative flex-1 py-3 text-base font-medium rounded-lg transition-all ${
              mode === 'single' ? 'text-white bg-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {c.singleOrder}
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`relative flex-1 py-3 text-base font-medium rounded-lg transition-all ${
              mode === 'bulk' ? 'text-white bg-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {c.bulkOrder}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {mode === 'bulk' ? (
          <div className={CARD}>
            <h3 className="text-base font-semibold text-slate-900 mb-2">{c.bulkPendingTitle}</h3>
            <p className="text-sm text-slate-600">{c.bulkPendingDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_2.5fr] gap-6">
            <div className="space-y-6">
              <div className="rounded-lg overflow-hidden bg-white border border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                <button type="button" className="w-full p-4 text-left transition-colors hover:bg-slate-50" onClick={() => setOrderForUserOpen((v) => !v)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-slate-900">{c.orderForUser}</span>
                    </div>
                    <span className="text-slate-500">{orderForUserOpen ? '▾' : '▸'}</span>
                  </div>
                </button>
              </div>

              {orderForUserOpen && (
                <div className={CARD}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <label className="text-sm font-medium text-slate-900">{c.searchCustomer}</label>
                    </div>
                    <div className="flex rounded-lg p-1 bg-slate-100">
                      <button type="button" onClick={() => setSearchMode('phone')} className={`px-3 py-1 text-xs rounded-md transition-colors ${searchMode === 'phone' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-900'}`}>{c.searchByPhone}</button>
                      <button type="button" onClick={() => setSearchMode('orderId')} className={`px-3 py-1 text-xs rounded-md transition-colors ${searchMode === 'orderId' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-900'}`}>{c.searchByOrderId}</button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchText}
                      onChange={(e) => { setSearchText(e.target.value); setSearchDone(false) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCustomerSearch() }}
                      className="w-full pl-10 pr-24 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-primary"
                      placeholder={searchMode === 'phone' ? c.searchPhonePlaceholder : c.searchOrderIdPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={handleCustomerSearch}
                      disabled={searchLoading || !searchText.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                    >
                      {searchLoading ? '...' : 'Cari'}
                    </button>
                  </div>
                  {/* Search results dropdown */}
                  {searchDone && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                      {searchResults.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-500">Tiada rekod dijumpai.</p>
                      ) : (
                        <ul>
                          {searchResults.map((order) => (
                            <li key={order.id}>
                              <button
                                type="button"
                                onClick={() => autofillFromOrder(order)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                              >
                                <p className="text-sm font-medium text-slate-900">{order.customerName}</p>
                                <p className="text-xs text-slate-500">{order.customerPhone} · #{order.orderNo}</p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg overflow-hidden bg-white border border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setCustomerInfoOpen((v) => !v)}>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900"><User className="w-4 h-4" />{c.customerInformation}</h3>
                  <button type="button" onClick={() => { setAiPasteOpen(true); setAiPasteError('') }} className="text-sm font-medium flex items-center gap-1 text-primary hover:text-primary-dark">
                    <Bot className="w-4 h-4" />{c.aiPaste}
                  </button>
                </div>
                {customerInfoOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-sm mb-1 text-gray-600">{c.name}</label>
                      <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-gray-300 text-gray-900 focus:ring-primary" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-gray-600">{c.emailOptional}</label>
                      <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-gray-300 text-gray-900 focus:ring-primary" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-gray-600">{c.phone}</label>
                      <input
                        className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-gray-300 text-gray-900 focus:ring-primary"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        onBlur={(e) => {
                          const normalized = normalizePhone(e.target.value)
                          if (normalized) setCustomerPhone(normalized)
                        }}
                        placeholder="0123456789"
                      />
                      {customerPhone && normalizePhone(customerPhone) !== customerPhone.trim() && (
                        <p className="mt-1 text-xs text-gray-400">Akan disimpan sebagai: <span className="font-medium text-primary">{normalizePhone(customerPhone)}</span></p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={CARD}>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-4 text-slate-900"><MapPin className="w-4 h-4" />{c.deliveryAddress}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1 text-slate-600">{c.streetAddress}</label>
                    <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-slate-600">{c.address2Optional}</label>
                    <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1 text-slate-600">{c.postcode}</label>
                      <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-slate-600">{c.city}</label>
                      <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1 text-slate-600">{c.state}</label>
                      <input className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary" value={stateName} onChange={(e) => setStateName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-slate-600">{c.country}</label>
                      <select className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary" value={country} onChange={(e) => setCountry(e.target.value)}>
                        <option value="Malaysia">{c.countries.malaysia}</option>
                        <option value="Singapore">{c.countries.singapore}</option>
                        <option value="Brunei">{c.countries.brunei}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={CARD}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900"><ShoppingCart className="w-4 h-4" />{c.orderItems}</h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={async () => { await ensureProducts(); setShowAddProduct((v) => !v) }} className="text-sm font-medium flex items-center gap-1 text-primary hover:text-primary-dark"><Plus className="w-4 h-4" />{c.addProduct}</button>
                    <button type="button" className="text-sm font-medium flex items-center gap-1 text-slate-700 hover:text-slate-900"><Package className="w-4 h-4" />{c.addBundle}</button>
                  </div>
                </div>

                {showAddProduct && (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_100px] gap-2 mb-3">
                    <select className={INPUT} value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); setSelectedVariationId('') }}>
                      <option value="">{c.chooseProduct}</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className={INPUT} value={selectedVariationId} onChange={(e) => setSelectedVariationId(e.target.value)}>
                      <option value="">{c.chooseVariation}</option>
                      {(selectedProduct?.variations ?? []).map((v) => <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>)}
                    </select>
                    <input className={INPUT} type="number" min={1} value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
                    <button type="button" onClick={addItem} className="px-3 py-2 rounded-lg text-white bg-primary hover:bg-primary-dark text-sm">{c.add}</button>
                  </div>
                )}

                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">{c.emptyItems}</div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3 bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{item.productName} - {item.variationName}</p>
                          <p className="text-xs text-slate-500">{item.sku} • RM {money(item.unitPrice)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} value={item.quantity} onChange={(e) => updateQty(item.id, Number(e.target.value || 1))} className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                          <p className="text-sm font-semibold w-24 text-right">RM {money(item.unitPrice * item.quantity)}</p>
                          <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={CARD}>
                  <h3 className="flex items-center gap-2 text-sm font-medium mb-3 text-slate-900"><CreditCard className="w-4 h-4" />{c.paymentMethod}</h3>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setPaymentMethod('COD')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${paymentMethod === 'COD' ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}><CreditCard className="w-4 h-4" /><span>{c.cod}</span></button>
                    <button type="button" onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${paymentMethod === 'BANK_TRANSFER' ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}><Globe className="w-4 h-4" /><span>{c.bankTransfer}</span></button>
                    <button type="button" onClick={() => setPaymentMethod('FOC')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${paymentMethod === 'FOC' ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}><Tag className="w-4 h-4" /><span>{c.foc}</span></button>
                  </div>
                  <p className="text-xs mt-1 text-slate-500">{c.selectPaymentHint}</p>
                </div>

                <div className={CARD}>
                  <h3 className="flex items-center gap-2 text-sm font-medium mb-3 text-slate-900"><Truck className="w-4 h-4" />{c.shippingMethod}</h3>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setShippingMethod('NINJA_VAN')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${shippingMethod === 'NINJA_VAN' ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}><Truck className="w-4 h-4" /><span>{c.ninjaVan}</span></button>
                    <button type="button" onClick={() => setShippingMethod('SELF_PICKUP')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${shippingMethod === 'SELF_PICKUP' ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}><MapPin className="w-4 h-4" /><span>{c.selfPickup}</span></button>
                  </div>
                  <p className="text-xs mt-1 text-slate-500">{c.selectShippingHint}</p>
                </div>
              </div>

              <div className={CARD}>
                <h3 className="flex items-center gap-2 text-sm font-medium mb-3 text-slate-900">{c.orderNotes}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={privateNoteOn} onChange={(e) => setPrivateNoteOn(e.target.checked)} />
                      <span className="text-sm font-medium text-slate-900">{c.privateNote}</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={awbNoteOn} onChange={(e) => setAwbNoteOn(e.target.checked)} />
                      <span className="text-sm font-medium text-slate-900">{c.awbNote}</span>
                    </label>
                  </div>
                  {privateNoteOn && (
                    <textarea className={INPUT} rows={2} placeholder={c.privateNotePlaceholder} value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} />
                  )}
                  {awbNoteOn && (
                    <textarea className={INPUT} rows={2} placeholder={c.awbNotePlaceholder} value={awbNote} onChange={(e) => setAwbNote(e.target.value)} />
                  )}
                </div>
              </div>

              <div className={CARD}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-900">{c.sellingPrice}</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      const next = !editSellingPrice
                      setEditSellingPrice(next)
                      if (!next) {
                        setSellingPriceInput(String(derivedTotal.toFixed(2)))
                        setDiscount(String(Number(discount || 0).toFixed(2)))
                      } else {
                        setSellingPriceInput(String(derivedTotal.toFixed(2)))
                      }
                    }} className="p-2 text-sm text-white rounded-lg bg-primary hover:bg-primary-dark">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      disabled={!editSellingPrice}
                      value={editSellingPrice ? sellingPriceInput : String(derivedTotal.toFixed(2))}
                      onChange={(e) => {
                        setSellingPriceInput(e.target.value)
                        syncDiscountFromSellingPrice(Number(e.target.value || 0))
                      }}
                      className="w-32 px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent bg-white border border-slate-300 text-slate-900 focus:ring-primary disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={LABEL}>{c.shippingFee}</label>
                    <input className={INPUT} type="number" min={0} step="0.01" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
                  </div>
                  <div>
                    <label className={LABEL}>{c.discount}</label>
                    <input className={INPUT} type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={submit} disabled={saving} className="flex-1 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {c.createOrder}
                </button>
                <Link href="/dashboard/orders" className="flex-1 border px-4 py-3 rounded-lg transition-colors border-slate-300 text-slate-700 hover:bg-white text-center">{c.cancel}</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {aiPasteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                {c.aiPasteTitle}
              </h3>
              <button
                type="button"
                onClick={() => setAiPasteOpen(false)}
                className="px-2 py-1 text-sm text-slate-500 hover:text-slate-900"
              >
                {c.aiPasteClose}
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-600">{c.aiPasteDescription}</p>
              <textarea
                rows={10}
                value={aiPasteInput}
                onChange={(e) => setAiPasteInput(e.target.value)}
                placeholder={c.aiPastePlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {aiPasteError && <p className="text-sm text-red-600">{aiPasteError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAiPasteOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                >
                  {c.aiPasteClose}
                </button>
                <button
                  type="button"
                  onClick={applyAIPaste}
                  disabled={aiPasteLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60 text-sm flex items-center gap-2"
                >
                  {aiPasteLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {aiPasteLoading ? c.aiPasteParsing : c.aiPasteApply}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
