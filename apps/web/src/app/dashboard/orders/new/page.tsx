'use client'

import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bot,
  CreditCard,
  Globe,
  Loader2,
  MapPin,
  Download,
  Upload,
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

interface AIPasteCatalogProduct {
  name: string
  variants: Array<{
    sku: string
    name: string
  }>
}

type BulkField =
  | 'order_ref'
  | 'customer_name'
  | 'customer_phone'
  | 'customer_email'
  | 'address_line1'
  | 'address_line2'
  | 'postcode'
  | 'city'
  | 'state'
  | 'country'
  | 'payment_method'
  | 'shipping_method'
  | 'shipping_fee'
  | 'discount'
  | 'private_note'
  | 'awb_note'
  | 'item_sku'
  | 'item_product_name'
  | 'item_variation_name'
  | 'item_qty'
  | 'item_unit_price'

type BulkRowStatus = 'ok' | 'problem'

interface BulkRow {
  id: string
  rowNumber: number
  data: Record<BulkField, string>
  errors: string[]
  status: BulkRowStatus
  submitted: boolean
  submitError?: string
}

interface SkuMatch {
  productId: string
  variationId: string
  productName: string
  variationName: string
  sku: string
  unitPrice: number
}

const BULK_FIELDS: BulkField[] = [
  'order_ref',
  'customer_name',
  'customer_phone',
  'customer_email',
  'address_line1',
  'address_line2',
  'postcode',
  'city',
  'state',
  'country',
  'payment_method',
  'shipping_method',
  'shipping_fee',
  'discount',
  'private_note',
  'awb_note',
  'item_sku',
  'item_product_name',
  'item_variation_name',
  'item_qty',
  'item_unit_price',
]

const EMPTY_BULK_DATA = BULK_FIELDS.reduce((acc, field) => {
  acc[field] = ''
  return acc
}, {} as Record<BulkField, string>)

const bulkText = (value: unknown): string => String(value ?? '').trim()

const headerKey = (value: unknown): string => String(value ?? '').trim().toLowerCase()

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
const LABEL = 'block text-xs font-medium text-gray-700 mb-1.5'
const CARD = 'rounded-lg p-4 bg-white border border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]'

const money = (value: number) => Number(value || 0).toFixed(2)
const BULK_TEMPLATE_URL = '/upload/bulk-order-template'

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
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkUploadError, setBulkUploadError] = useState('')
  const [bulkSubmitNote, setBulkSubmitNote] = useState('')
  const [bulkFilter, setBulkFilter] = useState<'all' | 'ok' | 'problem'>('all')
  const [bulkDragActive, setBulkDragActive] = useState(false)
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null)

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

  const skuIndex = useMemo(() => {
    const map = new Map<string, SkuMatch>()
    for (const product of products) {
      for (const variation of product.variations ?? []) {
        const sku = String(variation.sku ?? '').trim().toLowerCase()
        if (!sku) continue
        map.set(sku, {
          productId: product.id,
          variationId: variation.id,
          productName: product.name,
          variationName: variation.name,
          sku: variation.sku,
          unitPrice: Number(variation.price || 0),
        })
      }
    }
    return map
  }, [products])

  const bulkStats = useMemo(() => {
    const totalRows = bulkRows.length
    const okRows = bulkRows.filter((row) => row.status === 'ok').length
    const problemRows = totalRows - okRows
    const submittedRows = bulkRows.filter((row) => row.submitted).length
    return { totalRows, okRows, problemRows, submittedRows }
  }, [bulkRows])

  const filteredBulkRows = useMemo(() => {
    if (bulkFilter === 'all') return bulkRows
    return bulkRows.filter((row) => row.status === bulkFilter)
  }, [bulkRows, bulkFilter])

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
      let productPool = products
      if (productPool.length === 0) {
        productPool = await fetchProductPool()
        setProducts(productPool)
      }

      const productCatalog: AIPasteCatalogProduct[] = productPool
        .slice(0, 300)
        .map((product) => ({
          name: product.name,
          variants: (product.variations ?? [])
            .slice(0, 50)
            .map((variation) => ({
              sku: variation.sku,
              name: variation.name,
            })),
        }))

      const res = await fetch('/upload/order-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: aiPasteInput,
          productCatalog,
        }),
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

  const validateBulkData = (input: Record<BulkField, string>) => {
    const data: Record<BulkField, string> = { ...input }
    const errors: string[] = []

    data.customer_phone = normalizePhone(data.customer_phone)
    data.payment_method = normalizeMode(data.payment_method)
    data.shipping_method = normalizeShipping(data.shipping_method)
    data.country = data.country.trim() || 'Malaysia'
    data.postcode = data.postcode.replace(/\D/g, '').slice(0, 5)

    if (!data.order_ref.trim()) errors.push('order_ref is required')
    if (!data.customer_name.trim()) errors.push('customer_name is required')
    if (!data.customer_phone.trim()) errors.push('customer_phone is required')
    if (!data.address_line1.trim()) errors.push('address_line1 is required')
    if (!data.postcode.trim()) errors.push('postcode is required')
    if (!data.city.trim()) errors.push('city is required')
    if (!data.state.trim()) errors.push('state is required')
    if (!data.country.trim()) errors.push('country is required')
    if (!data.payment_method.trim()) errors.push('payment_method must be COD/BANK_TRANSFER/FOC')
    if (!data.shipping_method.trim()) errors.push('shipping_method must be NINJA_VAN/SELF_PICKUP')
    if (!data.item_sku.trim()) errors.push('item_sku is required')

    const qty = Number(data.item_qty)
    if (!Number.isFinite(qty) || qty <= 0) errors.push('item_qty must be greater than 0')

    if (data.postcode && data.postcode.length !== 5) errors.push('postcode must be 5 digits')

    const skuLower = data.item_sku.trim().toLowerCase()
    const matchedSku = skuLower ? skuIndex.get(skuLower) : undefined
    if (matchedSku) {
      data.item_unit_price = matchedSku.unitPrice.toFixed(2)
      if (!data.item_product_name.trim()) data.item_product_name = matchedSku.productName
      if (!data.item_variation_name.trim()) data.item_variation_name = matchedSku.variationName
    } else if (skuLower) {
      errors.push('item_sku is not matched with existing variation SKU')
    }

    return {
      data,
      errors,
      status: (errors.length === 0 ? 'ok' : 'problem') as BulkRowStatus,
    }
  }

  const applyBulkFieldEdit = (rowId: string, field: BulkField, value: string) => {
    setBulkRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        const nextData = { ...row.data, [field]: value }
        const checked = validateBulkData(nextData)
        return {
          ...row,
          data: checked.data,
          errors: checked.errors,
          status: checked.status,
          submitError: undefined,
          submitted: false,
        }
      }),
    )
  }

  const ensureBulkProducts = async (): Promise<Product[]> => {
    if (products.length > 0) return products
    const pool = await fetchProductPool()
    setProducts(pool)
    return pool
  }

  const loadBulkFile = async (file: File) => {
    if (!file) return
    setBulkUploadError('')
    setBulkSubmitNote('')
    setBulkUploading(true)

    try {
      await ensureBulkProducts()
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) throw new Error('Template sheet is empty')

      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
      if (rows.length <= 1) {
        throw new Error('No data rows found in file')
      }

      const headerRow = rows[0] ?? []
      const headerIndexes = new Map<string, number>()
      headerRow.forEach((header, idx) => {
        headerIndexes.set(headerKey(header), idx)
      })

      const parsedRows: BulkRow[] = []

      for (let index = 1; index < rows.length; index += 1) {
        const rawRow = rows[index] ?? []
        const rowData: Record<BulkField, string> = { ...EMPTY_BULK_DATA }

        for (const field of BULK_FIELDS) {
          const colIndex = headerIndexes.get(field)
          rowData[field] = colIndex === undefined ? '' : bulkText(rawRow[colIndex])
        }

        const isEmpty = BULK_FIELDS.every((field) => !rowData[field])
        if (isEmpty) continue

        const checked = validateBulkData(rowData)
        parsedRows.push({
          id: `${Date.now()}-${index}`,
          rowNumber: index + 1,
          data: checked.data,
          errors: checked.errors,
          status: checked.status,
          submitted: false,
        })
      }

      if (parsedRows.length === 0) {
        throw new Error('No usable rows found in file')
      }

      setBulkRows(parsedRows)
      setBulkFilter('all')
    } catch (e: unknown) {
      setBulkRows([])
      setBulkUploadError(e instanceof Error ? e.message : 'Failed to parse bulk file')
    } finally {
      setBulkUploading(false)
    }
  }

  const onBulkInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) await loadBulkFile(file)
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = ''
    }
  }

  const submitBulkOkRows = async () => {
    const okRows = bulkRows.filter((row) => row.status === 'ok' && !row.submitted)
    if (okRows.length === 0) {
      setBulkSubmitNote('No valid rows ready to submit.')
      return
    }

    setBulkSubmitting(true)
    setBulkSubmitNote('')

    const grouped = new Map<string, BulkRow[]>()
    for (const row of okRows) {
      const key = row.data.order_ref
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)?.push(row)
    }

    const successGroups: string[] = []
    const failedGroups: Array<{ key: string; message: string }> = []

    for (const [orderRef, groupRows] of grouped.entries()) {
      try {
        const first = groupRows[0]
        const paymentMethod = normalizeMode(first.data.payment_method)
        const shippingMethod = normalizeShipping(first.data.shipping_method)

        const mergedNotes = [
          first.data.private_note ? `[${c.noteTags.private}] ${first.data.private_note}` : '',
          first.data.awb_note ? `[${c.noteTags.awb}] ${first.data.awb_note}` : '',
          paymentMethod ? `[${c.noteTags.payment}] ${paymentMethod}` : '',
          shippingMethod ? `[${c.noteTags.shipping}] ${shippingMethod}` : '',
          `[BULK_REF] ${orderRef}`,
        ].filter(Boolean).join('\n')

        const orderItems = groupRows.map((row) => {
          const sku = row.data.item_sku.trim().toLowerCase()
          const matched = skuIndex.get(sku)
          if (!matched) {
            throw new Error(`SKU ${row.data.item_sku} is not matched`)
          }
          const quantity = Math.max(1, Number(row.data.item_qty || 1))
          return {
            productId: matched.productId,
            variationId: matched.variationId,
            sku: matched.sku,
            name: `${matched.productName} - ${matched.variationName}`,
            quantity,
            unitPrice: matched.unitPrice,
          }
        })

        await ordersApi.create({
          customerName: first.data.customer_name,
          customerPhone: normalizePhone(first.data.customer_phone),
          customerEmail: first.data.customer_email || undefined,
          shippingAddress: {
            line1: first.data.address_line1,
            line2: first.data.address_line2,
            postcode: first.data.postcode,
            city: first.data.city,
            state: first.data.state,
            country: first.data.country || 'Malaysia',
          },
          shippingFee: Number(first.data.shipping_fee || 0),
          discount: Number(first.data.discount || 0),
          notes: mergedNotes || undefined,
          items: orderItems,
        })

        successGroups.push(orderRef)
        setBulkRows((prev) =>
          prev.map((row) =>
            row.data.order_ref === orderRef
              ? { ...row, submitted: true, submitError: undefined }
              : row,
          ),
        )
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to submit bulk order group'
        failedGroups.push({ key: orderRef, message })
        setBulkRows((prev) =>
          prev.map((row) =>
            row.data.order_ref === orderRef
              ? { ...row, submitError: message }
              : row,
          ),
        )
      }
    }

    const successText = successGroups.length > 0 ? `Submitted ${successGroups.length} order group(s).` : ''
    const failText = failedGroups.length > 0 ? `Failed ${failedGroups.length} group(s): ${failedGroups.map((g) => g.key).join(', ')}` : ''
    setBulkSubmitNote([successText, failText].filter(Boolean).join(' '))
    setBulkSubmitting(false)
  }

  const downloadProblemRows = async () => {
    const problemRows = bulkRows.filter((row) => row.status === 'problem' || row.submitError)
    if (problemRows.length === 0) {
      setBulkSubmitNote('No problematic rows to export.')
      return
    }

    const XLSX = await import('xlsx')
    const exportRows = problemRows.map((row) => {
      const payload: Record<string, string> = {}
      for (const field of BULK_FIELDS) {
        payload[field] = row.data[field]
      }
      payload.validation_errors = [...row.errors, row.submitError ?? ''].filter(Boolean).join(' | ')
      return payload
    })

    const sheet = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'problem_rows')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bulk-order-problem-rows.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
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
    <div className="min-h-screen">
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
            <p className="text-sm text-slate-600 mb-4">{c.bulkPendingDesc}</p>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-sm font-medium text-slate-900">{c.bulkTemplateGuideTitle}</p>
              <p className="text-sm text-slate-600">{c.bulkTemplateGuideDesc}</p>
              <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                <li>{c.bulkTemplateHintOne}</li>
                <li>{c.bulkTemplateHintTwo}</li>
                <li>{c.bulkTemplateHintThree}</li>
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={BULK_TEMPLATE_URL}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
              >
                <Download className="w-4 h-4" />
                {c.bulkTemplateDownload}
              </a>
            </div>

            <div className="mt-5 space-y-4">
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onBulkInputChange}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setBulkDragActive(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setBulkDragActive(false)
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  setBulkDragActive(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) await loadBulkFile(file)
                }}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  bulkDragActive ? 'border-primary bg-amber-50' : 'border-slate-300 bg-slate-50'
                }`}
              >
                <Upload className="w-7 h-7 mx-auto text-primary mb-2" />
                <p className="text-sm text-slate-700 font-medium">{c.bulkDropTitle}</p>
                <p className="text-xs text-slate-500 mt-1">{c.bulkDropDesc}</p>
                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  disabled={bulkUploading}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {bulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {bulkUploading ? c.bulkUploadReading : c.bulkUploadButton}
                </button>
              </div>

              {bulkUploadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bulkUploadError}
                </div>
              )}

              {bulkRows.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">{c.bulkStatsTotal}</p>
                      <p className="text-lg font-semibold text-slate-900">{bulkStats.totalRows}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">{c.bulkStatsOk}</p>
                      <p className="text-lg font-semibold text-green-700">{bulkStats.okRows}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">{c.bulkStatsProblem}</p>
                      <p className="text-lg font-semibold text-red-700">{bulkStats.problemRows}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">{c.bulkStatsSubmitted}</p>
                      <p className="text-lg font-semibold text-blue-700">{bulkStats.submittedRows}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkFilter('all')}
                      className={`px-3 py-1.5 text-xs rounded-lg border ${bulkFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      {c.bulkFilterAll}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkFilter('ok')}
                      className={`px-3 py-1.5 text-xs rounded-lg border ${bulkFilter === 'ok' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      {c.bulkFilterOk}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkFilter('problem')}
                      className={`px-3 py-1.5 text-xs rounded-lg border ${bulkFilter === 'problem' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      {c.bulkFilterProblem}
                    </button>

                    <div className="ml-auto flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={submitBulkOkRows}
                        disabled={bulkSubmitting || bulkStats.okRows === 0}
                        className="px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark disabled:opacity-60"
                      >
                        {bulkSubmitting ? c.bulkSubmitting : c.bulkProceedOk}
                      </button>
                      <button
                        type="button"
                        onClick={downloadProblemRows}
                        disabled={bulkStats.problemRows === 0}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {c.bulkDownloadProblems}
                      </button>
                    </div>
                  </div>

                  {bulkSubmitNote && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {bulkSubmitNote}
                    </div>
                  )}

                  <div className="space-y-3">
                    {filteredBulkRows.map((row) => (
                      <div key={row.id} className={`rounded-lg border p-3 ${row.status === 'ok' ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'}`}>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-slate-700">{c.bulkRowLabel} {row.rowNumber}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${row.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {row.status === 'ok' ? c.bulkStatusOk : c.bulkStatusProblem}
                          </span>
                          {row.submitted && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.bulkStatusSubmitted}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input className={INPUT} placeholder="order_ref" value={row.data.order_ref} onChange={(e) => applyBulkFieldEdit(row.id, 'order_ref', e.target.value)} />
                          <input className={INPUT} placeholder="customer_name" value={row.data.customer_name} onChange={(e) => applyBulkFieldEdit(row.id, 'customer_name', e.target.value)} />
                          <input className={INPUT} placeholder="customer_phone" value={row.data.customer_phone} onChange={(e) => applyBulkFieldEdit(row.id, 'customer_phone', e.target.value)} />
                          <input className={INPUT} placeholder="postcode" value={row.data.postcode} onChange={(e) => applyBulkFieldEdit(row.id, 'postcode', e.target.value)} />
                          <input className={INPUT} placeholder="city" value={row.data.city} onChange={(e) => applyBulkFieldEdit(row.id, 'city', e.target.value)} />
                          <input className={INPUT} placeholder="state" value={row.data.state} onChange={(e) => applyBulkFieldEdit(row.id, 'state', e.target.value)} />
                          <input className={INPUT} placeholder="item_sku" value={row.data.item_sku} onChange={(e) => applyBulkFieldEdit(row.id, 'item_sku', e.target.value)} />
                          <input className={INPUT} placeholder="item_qty" value={row.data.item_qty} onChange={(e) => applyBulkFieldEdit(row.id, 'item_qty', e.target.value)} />
                          <input className={`${INPUT} bg-slate-100 text-slate-500 cursor-not-allowed`} placeholder="item_unit_price" value={row.data.item_unit_price} readOnly title="Auto from matched product SKU price" />
                        </div>

                        {(row.errors.length > 0 || row.submitError) && (
                          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {row.errors.length > 0 && <p>{row.errors.join(' | ')}</p>}
                            {row.submitError && <p className="mt-1">{row.submitError}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-lg overflow-hidden bg-white border border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900"><User className="w-4 h-4" />{c.customerInformation}</h3>
                  <button type="button" onClick={() => { setAiPasteOpen(true); setAiPasteError('') }} className="text-sm font-medium flex items-center gap-1 text-primary hover:text-primary-dark">
                    <Bot className="w-4 h-4" />{c.aiPaste}
                  </button>
                </div>
                <div className="p-4 space-y-3">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            </div>

            <div className="flex gap-3">
              <button onClick={submit} disabled={saving} className="flex-1 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {c.createOrder}
              </button>
              <Link href="/dashboard/orders" className="flex-1 border px-4 py-3 rounded-lg transition-colors border-slate-300 text-slate-700 hover:bg-white text-center">{c.cancel}</Link>
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
