import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
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

  async login(dto: LoginDto, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, memberships: { some: { tenantId } } },
    })

    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    if (hash !== user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const tokens = this.generateTokens(user.id, tenantId)
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    }
  }

  async sendTac(dto: SendTacDto, tenantId: string) {
    // Check email not already registered
    const exists = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } })
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

  async register(dto: RegisterDto, tenantId: string) {
    // Validate passwords match
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Kata laluan tidak sepadan')
    }

    // Verify TAC
    const tac = await this.prisma.signupTac.findFirst({
      where: { tenantId, email: dto.email, code: dto.tac, used: false },
      orderBy: { createdAt: 'desc' },
    })
    if (!tac) throw new BadRequestException('Kod TAC tidak sah')
    if (tac.expiresAt < new Date()) throw new BadRequestException('Kod TAC telah tamat tempoh')

    const exists = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } })
    if (exists) throw new ConflictException('Email already registered')

    const passwordHash = crypto.createHash('sha256').update(dto.password).digest('hex')

    const membershipCount = await this.prisma.membership.count({ where: { tenantId } })

    const ownerRole =
      (await this.prisma.role.findFirst({ where: { tenantId, name: 'Owner' } })) ??
      (await this.prisma.role.create({
        data: { tenantId, name: 'Owner', level: 100, permissions: ['*'], isDefault: false },
      }))

    const defaultRole =
      (await this.prisma.role.findFirst({ where: { tenantId, isDefault: true } })) ??
      (await this.prisma.role.create({
        data: { tenantId, name: 'Member', level: 1, permissions: ['order.read', 'product.read'], isDefault: true },
      }))

    const assignedRole = membershipCount === 0 ? ownerRole : defaultRole

    const user = await this.prisma.user.create({
      data: { tenantId, name: dto.name, email: dto.email, passwordHash },
    })

    await this.prisma.membership.create({
      data: { tenantId, userId: user.id, roleId: assignedRole.id, level: assignedRole.level },
    })

    // Mark TAC as used
    await this.prisma.signupTac.update({ where: { id: tac.id }, data: { used: true } })

    // Send welcome email (non-blocking)
    this.sendWelcomeEmail(tenantId, user.name, user.email).catch(() => null)

    const tokens = this.generateTokens(user.id, tenantId)
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

  private getSystemOwnerEmails(): string[] {
    const raw = this.config.get<string>('SYSTEM_OWNER_EMAILS', '')
    return raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
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
    const isOwner = permissions.includes('*') || membership.role.level >= 100
    const systemOwnerEmails = this.getSystemOwnerEmails()
    const isSystemOwnerFromList = systemOwnerEmails.includes(
      membership.user.email.toLowerCase(),
    )
    const isSystemOwner =
      systemOwnerEmails.length > 0 ? isSystemOwnerFromList : isOwner

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
        isOwner,
        isSystemOwner,
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
