const API_BASE = '/api/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('emas_token')
}

export function setToken(token: string) {
  localStorage.setItem('emas_token', token)
}

export function clearToken() {
  localStorage.removeItem('emas_token')
  localStorage.removeItem('emas_user')
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  }
  if (token && !skipAuth) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    if (res.status === 401 && !path.includes('/auth/login')) {
      clearToken()
      window.location.href = '/login'
    }
    throw new Error(err.message ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  sendTac: (email: string) =>
    request<{ sent: boolean; message: string }>('/auth/send-tac', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyTac: (email: string, code: string) =>
    request<{ valid: boolean }>('/auth/verify-tac', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  register: (data: { name: string; email: string; password: string; passwordConfirm: string; tac: string }) =>
    request<{ accessToken: string; user: Record<string, unknown> }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ accessToken: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    request<{
      id: string
      name: string
      email: string
      firstName?: string | null
      lastName?: string | null
      phone?: string | null
      avatarUrl?: string | null
      role: { name: string; level: number; isOwner: boolean; isSystemOwner: boolean }
    }>('/auth/me'),
}

export const systemPaymentSettings = {
  listAll: () => request<{ gateway: string; isEnabled: boolean; config: Record<string, unknown> }[]>('/system-payment-settings'),
  getOne: (gateway: string) =>
    request<{ gateway: string; isEnabled: boolean; config: Record<string, unknown> }>(`/system-payment-settings/${gateway}`),
  upsert: (gateway: string, data: { isEnabled: boolean; config: Record<string, unknown> }) =>
    request<unknown>(`/system-payment-settings/${gateway}`, { method: 'PUT', body: JSON.stringify(data) }),
  fetchChipPublicKey: (secretKey: string, environment: string = 'production') =>
    request<{ publicKey: string }>('/system-payment-settings/chip/public-key', {
      method: 'POST',
      body: JSON.stringify({ secretKey, environment }),
    }),
}

export type UserProfile = {
  id: string
  email: string
  displayName: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  icNumber: string | null
  dateOfBirth: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  state: string | null
  country: string | null
}

export const userProfile = {
  get: () => request<UserProfile>('/user/profile'),
  update: (data: Partial<UserProfile>) =>
    request<UserProfile>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/upload/profile', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error ?? 'Upload failed')
    }
    return res.json()
  },
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = {
  list: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ items: unknown[]; meta: unknown }>(`/order${q}`)
  },
  get: (id: string) => request<unknown>(`/order/${id}`),
  create: (data: unknown) => request<unknown>('/order', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request<unknown>(`/order/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updatePaymentStatus: (id: string, paymentStatus: string) =>
    request<unknown>(`/order/${id}/payment-status`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) }),
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = {
  summary: () => request<{ totalProducts: number; totalVariations: number; totalStock: number; lowStock: number }>('/product/summary'),
  categories: () => request<string[]>('/product/categories'),
  list: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ items: unknown[]; meta: { page: number; totalPages: number; total: number } }>(`/product${q}`)
  },
  get: (id: string) => request<unknown>(`/product/${id}`),
  create: (data: unknown) => request<unknown>('/product', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/product/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<unknown>(`/product/${id}`, { method: 'DELETE' }),
  addVariation: (productId: string, data: unknown) =>
    request<unknown>(`/product/${productId}/variations`, { method: 'POST', body: JSON.stringify(data) }),
  updateVariation: (productId: string, variationId: string, data: unknown) =>
    request<unknown>(`/product/${productId}/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteVariation: (productId: string, variationId: string) =>
    request<unknown>(`/product/${productId}/variations/${variationId}`, { method: 'DELETE' }),
  exportCsv: () => request<string>('/product/export'),
  importCsv: (csv: string) => request<{ created: number; skipped: number; errors: string[] }>('/product/import', { method: 'POST', body: JSON.stringify({ csv }) }),
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/upload/product', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload gagal' }))
      throw new Error(err.error ?? 'Upload gagal')
    }
    return res.json()
  },
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventory = {
  summary: () => request<{ totalStocks: number; lowStocks: number; warehouses: number }>('/inventory/summary'),
  stocks: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ items: unknown[]; meta: { page: number; totalPages: number; total: number } }>(`/inventory/stocks${q}`)
  },
  movements: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ items: unknown[]; meta: { page: number; totalPages: number; total: number } }>(`/inventory/movements${q}`)
  },
  adjust: (data: unknown) => request<unknown>('/inventory/stocks/adjust', { method: 'POST', body: JSON.stringify(data) }),
  warehouses: () => request<unknown[]>('/inventory/warehouses'),
  createWarehouse: (data: unknown) => request<unknown>('/inventory/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id: string, data: unknown) => request<unknown>(`/inventory/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWarehouse: (id: string) => request<unknown>(`/inventory/warehouses/${id}`, { method: 'DELETE' }),
}

// ─── Shipping ─────────────────────────────────────────────────────────────────

export const shipping = {
  listShipments: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ items: unknown[]; meta: unknown }>(`/shipping/shipments${q}`)
  },
  updateShipmentStatus: (id: string, status: string) =>
    request<unknown>(`/shipping/shipments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancelAwb: (id: string) =>
    request<unknown>(`/shipping/shipments/${id}/cancel`, { method: 'POST' }),
  listCouriers: () => request<unknown[]>('/shipping/couriers'),
  createCourier: (data: unknown) =>
    request<unknown>('/shipping/couriers', { method: 'POST', body: JSON.stringify(data) }),
  updateCourier: (id: string, data: unknown) =>
    request<unknown>(`/shipping/couriers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCourier: (id: string) =>
    request<unknown>(`/shipping/couriers/${id}`, { method: 'DELETE' }),
  generateAwb: (data: unknown) =>
    request<unknown>('/shipping/awb', { method: 'POST', body: JSON.stringify(data) }),
  trackShipment: (trackingNo: string, provider: string) =>
    request<unknown>('/shipping/track', { method: 'POST', body: JSON.stringify({ trackingNo, provider }) }),
  // Zones
  listZones: () => request<unknown[]>('/shipping/zones'),
  createZone: (data: unknown) =>
    request<unknown>('/shipping/zones', { method: 'POST', body: JSON.stringify(data) }),
  updateZone: (id: string, data: unknown) =>
    request<unknown>(`/shipping/zones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteZone: (id: string) =>
    request<unknown>(`/shipping/zones/${id}`, { method: 'DELETE' }),
  // Rates
  listRates: (zoneId: string) => request<unknown[]>(`/shipping/zones/${zoneId}/rates`),
  createRate: (zoneId: string, data: unknown) =>
    request<unknown>(`/shipping/zones/${zoneId}/rates`, { method: 'POST', body: JSON.stringify(data) }),
  updateRate: (zoneId: string, rateId: string, data: unknown) =>
    request<unknown>(`/shipping/zones/${zoneId}/rates/${rateId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRate: (zoneId: string, rateId: string) =>
    request<unknown>(`/shipping/zones/${zoneId}/rates/${rateId}`, { method: 'DELETE' }),
  // Default Settings
  getDefaults: () => request<unknown>('/shipping/settings/defaults'),
  updateDefaults: (data: unknown) =>
    request<unknown>('/shipping/settings/defaults', { method: 'PATCH', body: JSON.stringify(data) }),
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export const invoices = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ items: unknown[]; meta: unknown }>(`/invoice${q}`)
  },
  get: (id: string) => request<unknown>(`/invoice/${id}`),
  generate: (data: unknown) => request<unknown>('/invoice', { method: 'POST', body: JSON.stringify(data) }),
  createPaymentLink: (id: string) =>
    request<{ gateway: string; checkoutUrl: string; purchaseId?: string }>(`/invoice/${id}/payment-link`, {
      method: 'POST',
    }),
  syncPaymentStatus: (id: string) =>
    request<{ updated: boolean; chipStatus: string; paymentStatus: string }>(`/invoice/${id}/payment-sync`, {
      method: 'POST',
    }),
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const wallet = {
  balances: () => request<unknown[]>('/wallet/balances'),
  transactions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ items: unknown[]; meta: unknown }>(`/wallet/transactions${q}`)
  },
  credit: (data: unknown) => request<unknown>('/wallet/credit', { method: 'POST', body: JSON.stringify(data) }),
  debit: (data: unknown) => request<unknown>('/wallet/debit', { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Commission ───────────────────────────────────────────────────────────────

export const commission = {
  rules: () => request<unknown[]>('/commission/rules'),
  createRule: (data: unknown) => request<unknown>('/commission/rules', { method: 'POST', body: JSON.stringify(data) }),
  calculate: (orderId: string) =>
    request<unknown>('/commission/calculate', { method: 'POST', body: JSON.stringify({ orderId }) }),
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  user: { id: string; name: string; email: string; avatarUrl?: string }
  role: { id: string; name: string; level: number }
  joinedAt: string
}

export interface TeamInvite {
  id: string
  email: string
  role: { id: string; name: string }
  invitedByUser: { name: string; email: string }
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
}

export interface TeamRole {
  id: string
  name: string
  level: number
  permissions: string[]
  _count?: { memberships: number }
}

export const team = {
  members: () => request<TeamMember[]>('/user/members'),
  roles: () => request<TeamRole[]>('/user/roles'),
  createRole: (data: { name: string; level?: number; permissions?: string[] }) =>
    request<TeamRole>('/user/roles', { method: 'POST', body: JSON.stringify(data) }),
  assignRole: (membershipId: string, roleId: string) =>
    request('/user/members/' + membershipId + '/role', { method: 'PATCH', body: JSON.stringify({ roleId }) }),
  removeMember: (membershipId: string) =>
    request('/user/members/' + membershipId, { method: 'DELETE' }),
  invites: () => request<TeamInvite[]>('/user/invites'),
  sendInvite: (email: string, roleId: string) =>
    request('/user/invite', { method: 'POST', body: JSON.stringify({ email, roleId }) }),
  cancelInvite: (id: string) =>
    request('/user/invites/' + id, { method: 'DELETE' }),
  getInvite: (token: string) =>
    request<{ email: string; role: string; tenantName: string; expiresAt: string }>('/invite/' + token, { skipAuth: true }),
  acceptInvite: (token: string, data: { name: string; password: string }) =>
    request('/invite/' + token + '/accept', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
}

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = {
  list: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ items: unknown[]; meta: { page: number; totalPages: number; total: number } }>(`/customer${q}`)
  },
  get: (id: string) => request<unknown>(`/customer/${id}`),
  update: (id: string, data: unknown) => request<unknown>(`/customer/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  orders: (id: string, params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ items: unknown[]; meta: { total: number; limit: number } }>(`/customer/${id}/orders${q}`)
  },
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const coupons = {
  list: () => request<unknown[]>('/coupon'),
  create: (data: unknown) => request<unknown>('/coupon', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/coupon/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<unknown>(`/coupon/${id}`, { method: 'DELETE' }),
  validate: (data: { code: string; orderAmount?: number }) =>
    request<{ valid: boolean; discount: number; coupon: unknown }>('/coupon/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brands = {
  list: () => request<unknown[]>('/brand'),
  create: (data: unknown) => request<unknown>('/brand', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/brand/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<unknown>(`/brand/${id}`, { method: 'DELETE' }),
  getBranding: () => request<unknown>('/brand/branding/config'),
  saveBranding: (data: unknown) =>
    request<unknown>('/brand/branding/config', { method: 'PUT', body: JSON.stringify(data) }),
}

// ─── Roles ────────────────────────────────────────────────────────────────────

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const webhooks = {
  list: () => request<unknown[]>('/webhook'),
  create: (data: unknown) => request<unknown>('/webhook', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/webhook/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<unknown>(`/webhook/${id}`, { method: 'DELETE' }),
  toggle: (id: string, _isActive?: boolean) => request<unknown>(`/webhook/${id}/toggle`, { method: 'POST' }),
  test: (id: string, event: string) => request<{ success: boolean; status?: number; error?: string }>(`/webhook/${id}/test`, { method: 'POST', body: JSON.stringify({ event }) }),
}

// ─── Notification Channels ────────────────────────────────────────────────────

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP_UNOFFICIAL'

export interface NotificationChannelConfig {
  id: string
  channel: NotificationChannel
  settings: Record<string, unknown>
  isActive: boolean
}

export const notificationChannels = {
  list: () => request<NotificationChannelConfig[]>('/notification'),
  upsert: (channel: NotificationChannel, settings: Record<string, unknown>, isActive: boolean) =>
    request<NotificationChannelConfig>('/notification/config', {
      method: 'POST',
      body: JSON.stringify({ channel, settings, isActive }),
    }),
}

export interface NotifyCreditBalance {
  balance: number
  messagesRemaining: number
  pricePerMessage: number
}

export interface NotifyCreditTransaction {
  id: string
  type: 'TOPUP' | 'DEBIT' | 'REFUND'
  amount: number
  balanceBefore: number
  balanceAfter: number
  processingFee: number
  note: string | null
  status: string
  createdAt: string
}

export const notifyCredit = {
  getBalance: () => request<NotifyCreditBalance>('/notification/credit'),
  topUp: (amount: number) =>
    request<{ balance: number; messagesAdded: number }>('/notification/credit/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  initiateTopUp: (amount: number) =>
    request<{ checkoutUrl: string; purchaseId: string }>('/notification/credit/topup/initiate', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  verifyTopUp: (purchaseId: string) =>
    request<{ status: string; balance?: number; messagesAdded?: number }>('/notification/credit/topup/verify', {
      method: 'POST',
      body: JSON.stringify({ purchaseId }),
    }),
  listTransactions: (take = 20, skip = 0) =>
    request<{ transactions: NotifyCreditTransaction[]; total: number }>(
      `/notification/credit/transactions?take=${take}&skip=${skip}`,
    ),
}

export interface NotifyConfig {
  isEnabled: boolean
  spamPrevention: boolean
  triggerNewOrder: boolean
  triggerPending: boolean
  triggerInTransit: boolean
  triggerOutForDelivery: boolean
  triggerCompleted: boolean
  triggerReturned: boolean
  triggerRejected: boolean
}

export const notifyConfig = {
  get: () => request<NotifyConfig>('/notification/notify-config'),
  update: (data: Partial<NotifyConfig>) =>
    request<NotifyConfig>('/notification/notify-config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ─── System Email ─────────────────────────────────────────────────────────────

export interface SystemEmailConfig {
  id?: string
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  isEnabled: boolean
}

export const systemEmail = {
  get: () => request<SystemEmailConfig | null>('/system-email'),
  upsert: (data: SystemEmailConfig) => {
    const { host, port, secure, user, pass, from, isEnabled } = data
    return request<SystemEmailConfig>('/system-email', { method: 'PUT', body: JSON.stringify({ host, port, secure, user, pass, from, isEnabled }) })
  },
  test: (to: string) =>
    request<{ success: boolean }>('/system-email/test', { method: 'POST', body: JSON.stringify({ to }) }),
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export const roles = {
  list: () => request<unknown[]>('/role'),
  create: (data: unknown) => request<unknown>('/role', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/role/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<unknown>(`/role/${id}`, { method: 'DELETE' }),
  automations: () => request<unknown[]>('/role/automation/list'),
  createAutomation: (data: unknown) =>
    request<unknown>('/role/automation', { method: 'POST', body: JSON.stringify(data) }),
  updateAutomation: (id: string, data: unknown) =>
    request<unknown>(`/role/automation/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAutomation: (id: string) => request<unknown>(`/role/automation/${id}`, { method: 'DELETE' }),
  trigger: (data: { event: string; userId: string; context?: Record<string, unknown> }) =>
    request<unknown>('/role/automation/trigger', { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Payment Settings ─────────────────────────────────────────────────────────

export const paymentSettings = {
  listAll: () => request<{ gateway: string; isEnabled: boolean; config: Record<string, unknown> }[]>('/payment-settings'),
  getOne: (gateway: string) =>
    request<{ gateway: string; isEnabled: boolean; config: Record<string, unknown> }>(`/payment-settings/${gateway}`),
  upsert: (gateway: string, data: { isEnabled: boolean; config: Record<string, unknown> }) =>
    request<unknown>(`/payment-settings/${gateway}`, { method: 'PUT', body: JSON.stringify(data) }),
  fetchChipPublicKey: (secretKey: string, environment: string) =>
    request<{ publicKey: string }>('/payment-settings/chip/public-key', {
      method: 'POST',
      body: JSON.stringify({ secretKey, environment }),
    }),
}

// ─── System Settings ──────────────────────────────────────────────────────────

export type SystemMode = 'ACTIVE' | 'MAINTENANCE'

export type SystemPlan = {
  id: string
  code: string
  name: string
  priceMonthly: number
  priceYearly: number
  maxUsers: number
  maxOrders: number
  maxProducts: number
  isActive: boolean
}

export const systemSettings = {
  getMode: () => request<{ mode: SystemMode }>('/tenant/system-mode'),
  setMode: (mode: SystemMode) =>
    request<{ mode: SystemMode }>('/tenant/system-mode', { method: 'PATCH', body: JSON.stringify({ mode }) }),
  getSubscription: () => request<{
    status: string
    billingCycle: string
    currentPeriodStart: string
    currentPeriodEnd: string
    plan: { name: string; code: string; priceMonthly: number; priceYearly: number; maxUsers: number; maxOrders: number; maxProducts: number }
  } | Record<string, never>>('/tenant/subscription'),
  listPlans: () => request<SystemPlan[]>('/tenant/subscription/plans'),
  createPlan: (data: Omit<SystemPlan, 'id'>) =>
    request<SystemPlan>('/tenant/subscription/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePlan: (id: string, data: Partial<Omit<SystemPlan, 'id'>>) =>
    request<SystemPlan>(`/tenant/subscription/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

export const systemUsers = {
  list: () => request<unknown[]>('/user/members'),
  listRoles: () => request<unknown[]>('/user/roles'),
  assignRole: (membershipId: string, roleId: string) =>
    request<unknown>(`/user/members/${membershipId}/role`, { method: 'PATCH', body: JSON.stringify({ roleId }) }),
}
