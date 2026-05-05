import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import * as nodemailer from 'nodemailer'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto, RegisterDto, SendTacDto, VerifyTacDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    // Find all user records for this email across all workspaces
    // A subscriber will have level=100 in their own workspace; prefer that over member accounts
    const allUsers = await this.prisma.user.findMany({
      where: { email: dto.email },
      include: { memberships: { orderBy: { level: 'desc' }, take: 1 } },
    })

    if (!allUsers.length) throw new UnauthorizedException('Invalid credentials')

    // Sort: Owner workspace first (level 100), then members (level 1)
    allUsers.sort((a, b) => (b.memberships[0]?.level ?? 0) - (a.memberships[0]?.level ?? 0))
    const user = allUsers[0]

    if (!user.passwordHash) throw new UnauthorizedException('Invalid credentials')
    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    if (hash !== user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const membership = user.memberships[0]
    if (!membership) throw new UnauthorizedException('No workspace found')

    // JWT carries the workspace tenantId (not the platform domain tenant)
    const tokens = this.generateTokens(user.id, membership.tenantId)
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    }
  }

  async devLogin() {
    const enabled = this.config.get<string>('SYSTEM_LOGIN', 'off')
    if (enabled !== 'on') throw new ForbiddenException('Dev login is disabled')

    const emails = this.getSuperAdminEmails()
    if (!emails.length) throw new ForbiddenException('SYSTEM_OWNER_EMAILS not configured')

    const email = emails[0]
    const allUsers = await this.prisma.user.findMany({
      where: { email },
      include: { memberships: { orderBy: { level: 'desc' }, take: 1 } },
    })
    if (!allUsers.length) throw new UnauthorizedException('Owner user not found')

    allUsers.sort((a, b) => (b.memberships[0]?.level ?? 0) - (a.memberships[0]?.level ?? 0))
    const user = allUsers[0]
    const membership = user.memberships[0]
    if (!membership) throw new UnauthorizedException('No workspace found')

    const tokens = this.generateTokens(user.id, membership.tenantId)
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    }
  }

  async sendTac(dto: SendTacDto, tenantId: string) {
    // Check email not already a subscriber (Owner in any workspace)
    const exists = await this.prisma.user.findFirst({
      where: { email: dto.email, memberships: { some: { level: { gte: 100 } } } },
    })
    if (exists) throw new ConflictException('Email sudah didaftarkan')

    // Get system email config
    const emailCfg = await this.prisma.systemEmailConfig.findUnique({ where: { tenantId } })
    if (!emailCfg || !emailCfg.isEnabled) {
      throw new BadRequestException('Sistem e-mel belum dikonfigurasi. Sila hubungi pentadbir.')
    }

    // Generate 6-digit TAC
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Invalidate previous TAC for this email
    await this.prisma.signupTac.updateMany({
      where: { tenantId, email: dto.email, used: false },
      data: { used: true },
    })

    await this.prisma.signupTac.create({
      data: { tenantId, email: dto.email, code, expiresAt },
    })

    // Send email
    const transporter = nodemailer.createTransport({
      host: emailCfg.host,
      port: emailCfg.port,
      secure: emailCfg.secure,
      auth: { user: emailCfg.user, pass: emailCfg.pass },
    })

    try {
      await transporter.sendMail({
        from: emailCfg.from,
        to: dto.email,
        subject: 'Kod TAC Pendaftaran EMAS',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#1e293b;margin:0 0 8px">Kod Pengesahan (TAC)</h2>
            <p style="color:#475569;margin:0 0 24px">Gunakan kod di bawah untuk melengkapkan pendaftaran anda. Kod ini sah selama <strong>10 minit</strong>.</p>
            <div style="background:#fff;border:2px solid #f59e0b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1e293b;">${code}</span>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0">Jika anda tidak meminta kod ini, abaikan e-mel ini.</p>
          </div>
        `,
      })
    } catch (err) {
      throw new BadRequestException(`Gagal hantar e-mel: ${(err as Error).message}`)
    }

    return { sent: true, message: 'Kod TAC telah dihantar ke e-mel anda' }
  }

  async verifyTac(dto: VerifyTacDto, tenantId: string) {
    const tac = await this.prisma.signupTac.findFirst({
      where: { tenantId, email: dto.email, code: dto.code, used: false },
      orderBy: { createdAt: 'desc' },
    })

    if (!tac) throw new BadRequestException('Kod TAC tidak sah')
    if (tac.expiresAt < new Date()) throw new BadRequestException('Kod TAC telah tamat tempoh')

    return { valid: true }
  }

  async register(dto: RegisterDto, platformTenantId: string) {
    // Validate passwords match
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Kata laluan tidak sepadan')
    }

    // Verify TAC (TACs stored under platform tenant, pre-workspace-creation)
    const tac = await this.prisma.signupTac.findFirst({
      where: { tenantId: platformTenantId, email: dto.email, code: dto.tac, used: false },
      orderBy: { createdAt: 'desc' },
    })
    if (!tac) throw new BadRequestException('Kod TAC tidak sah')
    if (tac.expiresAt < new Date()) throw new BadRequestException('Kod TAC telah tamat tempoh')

    // Check not already a subscriber
    const exists = await this.prisma.user.findFirst({
      where: { email: dto.email, memberships: { some: { level: { gte: 100 } } } },
    })
    if (exists) throw new ConflictException('Email already registered')

    const passwordHash = crypto.createHash('sha256').update(dto.password).digest('hex')

    // ── Create a new Workspace (Tenant) for this subscriber ──────────────
    const slugBase = dto.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase()
    const workspace = await this.prisma.tenant.create({
      data: {
        slug: `${slugBase}-${Date.now()}`,
        name: dto.name,
      },
    })

    // Create Owner role for the new workspace
    const ownerRole = await this.prisma.role.create({
      data: { tenantId: workspace.id, name: 'Owner', level: 100, permissions: ['*'], isDefault: false },
    })

    // Create default Member role (for future team invites)
    await this.prisma.role.create({
      data: { tenantId: workspace.id, name: 'Member', level: 1, permissions: ['order.read', 'product.read'], isDefault: true },
    })

    // Create user in their workspace
    const user = await this.prisma.user.create({
      data: { tenantId: workspace.id, name: dto.name, email: dto.email, passwordHash },
    })

    // Create Owner membership
    await this.prisma.membership.create({
      data: { tenantId: workspace.id, userId: user.id, roleId: ownerRole.id, level: ownerRole.level },
    })

    // Mark TAC as used
    await this.prisma.signupTac.update({ where: { id: tac.id }, data: { used: true } })

    // Send welcome email — use platform email config (non-blocking)
    this.sendWelcomeEmail(platformTenantId, user.name, user.email).catch(() => null)

    // JWT carries workspace tenantId
    const tokens = this.generateTokens(user.id, workspace.id)
    return { ...tokens, user: { id: user.id, name: user.name, email: user.email } }
  }

  private async sendWelcomeEmail(tenantId: string, name: string, email: string) {
    const emailCfg = await this.prisma.systemEmailConfig.findUnique({ where: { tenantId } })
    if (!emailCfg || !emailCfg.isEnabled) return

    const transporter = nodemailer.createTransport({
      host: emailCfg.host,
      port: emailCfg.port,
      secure: emailCfg.secure,
      auth: { user: emailCfg.user, pass: emailCfg.pass },
    })

    await transporter.sendMail({
      from: emailCfg.from,
      to: email,
      subject: 'Selamat Datang ke EMAS!',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
          <h2 style="color:#1e293b;margin:0 0 8px">Selamat Datang, ${name}! 🎉</h2>
          <p style="color:#475569;margin:0 0 16px">Akaun anda telah berjaya didaftarkan dalam sistem EMAS.</p>
          <p style="color:#475569;margin:0 0 24px">Anda kini boleh log masuk dan mula menggunakan platform pengurusan perniagaan anda.</p>
          <p style="color:#94a3b8;font-size:12px;margin:0">Terima kasih kerana memilih EMAS.</p>
        </div>
      `,
    })
  }

  private generateTokens(userId: string, tenantId: string) {
    const payload = { sub: userId, tenantId }
    const accessToken = this.jwt.sign(payload)
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.config.get('JWT_SECRET') + '-refresh',
    })
    return { accessToken, refreshToken }
  }

  private getSuperAdminEmails(): string[] {
    const raw = this.config.get<string>('SYSTEM_OWNER_EMAILS', '')
    return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  }

  async getMe(userId: string, tenantId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, tenantId },
      include: { role: true, user: true },
    })
    if (!membership) throw new UnauthorizedException('Membership not found')

    const permissions = Array.isArray(membership.role.permissions)
      ? membership.role.permissions.map((p) => String(p))
      : []

    // Tier 2 – Super User: tenant owner (level >= 100 or wildcard)
    const isOwner = membership.role.level >= 100 || permissions.includes('*')

    // Tier 1 – Super Admin: strictly from SYSTEM_OWNER_EMAILS whitelist
    const superAdminEmails = this.getSuperAdminEmails()
    const isSuperAdmin = superAdminEmails.length > 0
      ? superAdminEmails.includes(membership.user.email.toLowerCase())
      : false  // empty whitelist = no one is super admin explicitly

    // isSystemOwner = strictly platform-level admin only (NOT subscribers/owners)
    const isSystemOwner = isSuperAdmin

    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      phone: membership.user.phone,
      avatarUrl: membership.user.avatarUrl,
      role: {
        name: membership.role.name,
        level: membership.role.level,
        permissions,
        isOwner,
        isSuperAdmin,
        isSystemOwner,  // kept for backward compat
      },
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; tenantId: string }>(refreshToken, {
        secret: this.config.get('JWT_SECRET') + '-refresh',
      })
      return this.generateTokens(payload.sub, payload.tenantId)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}
