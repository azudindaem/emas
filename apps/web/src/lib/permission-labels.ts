// Human-readable labels for all RBAC permission keys.
// Used in api.ts to convert "Missing permission: product.write"
// into a user-friendly message in the current locale.

export const permissionLabels: Record<string, Record<string, string>> = {
  en: {
    'product.read':              'view products',
    'product.write':             'add or edit products',
    'product.variation.write':   'manage product variations',
    'order.read':                'view orders',
    'order.write':               'create or edit orders',
    'order.status.write':        'update order status',
    'order.payment.write':       'update payment status',
    'brand.read':                'view brands',
    'brand.write':               'manage brands',
    'commission.read':           'view commission rules',
    'commission.write':          'manage commission rules',
    'coupon.read':               'view coupons',
    'coupon.write':              'manage coupons',
    'inventory.read':            'view inventory',
    'inventory.write':           'manage inventory',
    'inventory.reserve':         'reserve inventory',
    'invoice.read':              'view invoices',
    'invoice.write':             'manage invoices',
    'notification.config.read':  'view notification settings',
    'notification.config.write': 'manage notification settings',
    'notification.send':         'send notifications',
    'role.read':                 'view roles',
    'role.write':                'manage roles',
    'settings.email.read':       'view email settings',
    'settings.email.write':      'manage email settings',
    'settings.payment.read':     'view payment settings',
    'settings.payment.write':    'manage payment settings',
    'settings.shipping.read':    'view shipping settings',
    'settings.shipping.write':   'manage shipping settings',
    'shipping.read':             'view shipping options',
    'shipping.write':            'manage shipping options',
    'team.invite.send':          'invite team members',
    'team.members.read':         'view team members',
    'team.members.write':        'manage team members',
    'team.roles.assign':         'assign roles to team members',
    'team.roles.read':           'view team roles',
    'team.roles.write':          'manage team roles',
    'wallet.read':               'view wallet',
    'wallet.write':              'manage wallet',
  },
  ms: {
    'product.read':              'lihat produk',
    'product.write':             'tambah atau edit produk',
    'product.variation.write':   'urus variasi produk',
    'order.read':                'lihat pesanan',
    'order.write':               'cipta atau edit pesanan',
    'order.status.write':        'kemaskini status pesanan',
    'order.payment.write':       'kemaskini status pembayaran',
    'brand.read':                'lihat jenama',
    'brand.write':               'urus jenama',
    'commission.read':           'lihat peraturan komisen',
    'commission.write':          'urus peraturan komisen',
    'coupon.read':               'lihat kupon',
    'coupon.write':              'urus kupon',
    'inventory.read':            'lihat inventori',
    'inventory.write':           'urus inventori',
    'inventory.reserve':         'rezab inventori',
    'invoice.read':              'lihat invois',
    'invoice.write':             'urus invois',
    'notification.config.read':  'lihat tetapan notifikasi',
    'notification.config.write': 'urus tetapan notifikasi',
    'notification.send':         'hantar notifikasi',
    'role.read':                 'lihat peranan',
    'role.write':                'urus peranan',
    'settings.email.read':       'lihat tetapan e-mel',
    'settings.email.write':      'urus tetapan e-mel',
    'settings.payment.read':     'lihat tetapan pembayaran',
    'settings.payment.write':    'urus tetapan pembayaran',
    'settings.shipping.read':    'lihat tetapan penghantaran',
    'settings.shipping.write':   'urus tetapan penghantaran',
    'shipping.read':             'lihat opsyen penghantaran',
    'shipping.write':            'urus opsyen penghantaran',
    'team.invite.send':          'jemput ahli pasukan',
    'team.members.read':         'lihat ahli pasukan',
    'team.members.write':        'urus ahli pasukan',
    'team.roles.assign':         'tetapkan peranan kepada ahli pasukan',
    'team.roles.read':           'lihat peranan pasukan',
    'team.roles.write':          'urus peranan pasukan',
    'wallet.read':               'lihat dompet',
    'wallet.write':              'urus dompet',
  },
}

export const noPermissionPrefix: Record<string, string> = {
  en: 'You do not have permission to',
  ms: 'Anda tidak mempunyai kebenaran untuk',
}

export function translatePermissionError(rawMessage: string): string {
  const match = rawMessage.match(/^Missing permission: (.+)$/)
  if (!match) return rawMessage

  const permKey = match[1]
  const locale =
    typeof window !== 'undefined'
      ? (localStorage.getItem('emas_locale') ?? 'en')
      : 'en'
  const lang = locale in permissionLabels ? locale : 'en'
  const action = permissionLabels[lang][permKey] ?? permKey
  const prefix = noPermissionPrefix[lang]
  return `${prefix}: ${action}`
}
