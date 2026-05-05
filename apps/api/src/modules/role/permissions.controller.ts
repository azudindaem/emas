import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { DiscoveryService, Reflector } from '@nestjs/core'
import { REQUIRED_PERMISSION_KEY } from '../../common/decorators/require-permission.decorator'

type Locale = 'ms' | 'en'

interface PermMeta { label: string; group: string }

// Labels and groups indexed by locale → permission key
const PERMISSION_META: Record<Locale, Record<string, PermMeta>> = {
  ms: {
    'order.read':                { label: 'Lihat pesanan',              group: 'Pesanan' },
    'order.write':               { label: 'Cipta/edit pesanan',         group: 'Pesanan' },
    'order.status.write':        { label: 'Kemaskini status pesanan',   group: 'Pesanan' },
    'order.payment.write':       { label: 'Kemaskini pembayaran',       group: 'Pesanan' },
    'product.read':              { label: 'Lihat produk',               group: 'Produk' },
    'product.write':             { label: 'Cipta/edit produk',          group: 'Produk' },
    'product.variation.write':   { label: 'Edit variasi produk',        group: 'Produk' },
    'inventory.read':            { label: 'Lihat inventori',            group: 'Inventori' },
    'inventory.write':           { label: 'Kemaskini inventori',        group: 'Inventori' },
    'inventory.reserve':         { label: 'Rizab stok',                 group: 'Inventori' },
    'brand.read':                { label: 'Lihat jenama',               group: 'Jenama' },
    'brand.write':               { label: 'Urus jenama',                group: 'Jenama' },
    'coupon.read':               { label: 'Lihat kupon',                group: 'Kupon' },
    'coupon.write':              { label: 'Urus kupon',                 group: 'Kupon' },
    'commission.read':           { label: 'Lihat komisen',              group: 'Komisen' },
    'commission.write':          { label: 'Urus komisen',               group: 'Komisen' },
    'shipping.read':             { label: 'Lihat penghantaran',         group: 'Penghantaran' },
    'shipping.write':            { label: 'Urus penghantaran',          group: 'Penghantaran' },
    'invoice.read':              { label: 'Lihat invois',               group: 'Invois' },
    'invoice.write':             { label: 'Cipta/edit invois',          group: 'Invois' },
    'wallet.read':               { label: 'Lihat dompet',               group: 'Dompet' },
    'wallet.write':              { label: 'Urus dompet',                group: 'Dompet' },
    'role.read':                 { label: 'Lihat peranan',              group: 'Pasukan' },
    'role.write':                { label: 'Urus peranan',               group: 'Pasukan' },
    'team.members.read':         { label: 'Lihat ahli pasukan',         group: 'Pasukan' },
    'team.members.write':        { label: 'Urus ahli pasukan',          group: 'Pasukan' },
    'team.roles.read':           { label: 'Lihat peranan pasukan',      group: 'Pasukan' },
    'team.roles.write':          { label: 'Urus peranan pasukan',       group: 'Pasukan' },
    'team.roles.assign':         { label: 'Assign peranan',             group: 'Pasukan' },
    'team.invite.send':          { label: 'Jemput ahli baru',           group: 'Pasukan' },
    'notification.send':         { label: 'Hantar notifikasi',          group: 'Notifikasi' },
    'notification.config.read':  { label: 'Lihat konfigurasi notif',    group: 'Notifikasi' },
    'notification.config.write': { label: 'Urus konfigurasi notif',     group: 'Notifikasi' },
    'settings.payment.read':     { label: 'Lihat tetapan pembayaran',   group: 'Tetapan' },
    'settings.payment.write':    { label: 'Urus tetapan pembayaran',    group: 'Tetapan' },
    'settings.email.read':       { label: 'Lihat tetapan e-mel',        group: 'Tetapan' },
    'settings.email.write':      { label: 'Urus tetapan e-mel',         group: 'Tetapan' },
    'settings.profile.read':     { label: 'Lihat profil kedai',         group: 'Tetapan' },
    'settings.profile.write':    { label: 'Kemaskini profil kedai',     group: 'Tetapan' },
    'settings.shipping.read':    { label: 'Lihat tetapan penghantaran', group: 'Tetapan' },
    'settings.shipping.write':   { label: 'Urus tetapan penghantaran', group: 'Tetapan' },
  },
  en: {
    'order.read':                { label: 'View orders',                group: 'Orders' },
    'order.write':               { label: 'Create/edit orders',         group: 'Orders' },
    'order.status.write':        { label: 'Update order status',        group: 'Orders' },
    'order.payment.write':       { label: 'Update payment',             group: 'Orders' },
    'product.read':              { label: 'View products',              group: 'Products' },
    'product.write':             { label: 'Create/edit products',       group: 'Products' },
    'product.variation.write':   { label: 'Edit product variations',    group: 'Products' },
    'inventory.read':            { label: 'View inventory',             group: 'Inventory' },
    'inventory.write':           { label: 'Update inventory',           group: 'Inventory' },
    'inventory.reserve':         { label: 'Reserve stock',              group: 'Inventory' },
    'brand.read':                { label: 'View brands',                group: 'Brands' },
    'brand.write':               { label: 'Manage brands',              group: 'Brands' },
    'coupon.read':               { label: 'View coupons',               group: 'Coupons' },
    'coupon.write':              { label: 'Manage coupons',             group: 'Coupons' },
    'commission.read':           { label: 'View commission',            group: 'Commission' },
    'commission.write':          { label: 'Manage commission',          group: 'Commission' },
    'shipping.read':             { label: 'View shipping',              group: 'Shipping' },
    'shipping.write':            { label: 'Manage shipping',            group: 'Shipping' },
    'invoice.read':              { label: 'View invoices',              group: 'Invoices' },
    'invoice.write':             { label: 'Create/edit invoices',       group: 'Invoices' },
    'wallet.read':               { label: 'View wallet',                group: 'Wallet' },
    'wallet.write':              { label: 'Manage wallet',              group: 'Wallet' },
    'role.read':                 { label: 'View roles',                 group: 'Team' },
    'role.write':                { label: 'Manage roles',               group: 'Team' },
    'team.members.read':         { label: 'View team members',          group: 'Team' },
    'team.members.write':        { label: 'Manage team members',        group: 'Team' },
    'team.roles.read':           { label: 'View team roles',            group: 'Team' },
    'team.roles.write':          { label: 'Manage team roles',          group: 'Team' },
    'team.roles.assign':         { label: 'Assign roles',               group: 'Team' },
    'team.invite.send':          { label: 'Invite new members',         group: 'Team' },
    'notification.send':         { label: 'Send notifications',         group: 'Notifications' },
    'notification.config.read':  { label: 'View notification config',   group: 'Notifications' },
    'notification.config.write': { label: 'Manage notification config', group: 'Notifications' },
    'settings.payment.read':     { label: 'View payment settings',      group: 'Settings' },
    'settings.payment.write':    { label: 'Manage payment settings',    group: 'Settings' },
    'settings.email.read':       { label: 'View email settings',        group: 'Settings' },
    'settings.email.write':      { label: 'Manage email settings',      group: 'Settings' },
    'settings.profile.read':     { label: 'View store profile',         group: 'Settings' },
    'settings.profile.write':    { label: 'Update store profile',       group: 'Settings' },
    'settings.shipping.read':    { label: 'View shipping settings',     group: 'Settings' },
    'settings.shipping.write':   { label: 'Manage shipping settings',   group: 'Settings' },
  },
}

export interface PermissionItem {
  key: string
  label: string
  group: string
}

export interface PermissionGroup {
  group: string
  permissions: PermissionItem[]
}

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  @Get()
  listPermissions(@Query('locale') locale: string): PermissionGroup[] {
    const lang: Locale = locale === 'ms' ? 'ms' : 'en'
    const meta = PERMISSION_META[lang]

    // Collect permission keys discovered from controller handlers
    const keys = new Set<string>()
    for (const wrapper of this.discovery.getControllers()) {
      const instance = wrapper.instance
      if (!instance || typeof instance !== 'object') continue
      const proto = Object.getPrototypeOf(instance)
      for (const method of Object.getOwnPropertyNames(proto)) {
        if (method === 'constructor') continue
        const handler = proto[method]
        if (typeof handler !== 'function') continue
        const perm = this.reflector.get<string>(REQUIRED_PERMISSION_KEY, handler)
        if (perm) keys.add(perm)
      }
    }

    // Merge discovered keys with the locale meta — unknown keys get raw key as label
    const allKeys = new Set([...keys, ...Object.keys(meta)])
    const grouped = new Map<string, PermissionItem[]>()

    for (const key of [...allKeys].sort()) {
      const entry = meta[key] ?? {
        label: key,
        group: key.split('.')[0] ?? 'Other',
      }
      if (!grouped.has(entry.group)) grouped.set(entry.group, [])
      grouped.get(entry.group)!.push({ key, label: entry.label, group: entry.group })
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, permissions]) => ({ group, permissions }))
  }
}
