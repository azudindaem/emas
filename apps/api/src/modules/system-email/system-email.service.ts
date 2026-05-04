import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertSystemEmailDto } from './dto/system-email.dto'
import * as nodemailer from 'nodemailer'

@Injectable()
export class SystemEmailService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(tenantId: string) {
    const cfg = await this.prisma.systemEmailConfig.findUnique({ where: { tenantId } })
    if (!cfg) return null
    // Mask password in response
    return { ...cfg, pass: cfg.pass ? '••••••••' : '' }
  }

  async upsert(tenantId: string, dto: UpsertSystemEmailDto) {
    const base = {
      host: dto.host.trim(),
      port: dto.port,
      secure: dto.secure,
      user: dto.user.trim(),
      from: dto.from.trim(),
      isEnabled: dto.isEnabled,
    }

    // If pass is blank, keep existing password (only update on create or when provided)
    const existing = dto.pass?.trim()
      ? null
      : await this.prisma.systemEmailConfig.findUnique({ where: { tenantId }, select: { pass: true } })
    const pass = dto.pass?.trim() || existing?.pass || ''

    const cfg = await this.prisma.systemEmailConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...base, pass },
      update: { ...base, ...(dto.pass?.trim() ? { pass: dto.pass.trim() } : {}) },
    })

    return { ...cfg, pass: '••••••••' }
  }

  async testEmail(tenantId: string, to: string) {
    const cfg = await this.prisma.systemEmailConfig.findUnique({ where: { tenantId } })
    if (!cfg) throw new BadRequestException('Email not configured')
    if (!cfg.isEnabled) throw new BadRequestException('Email config is disabled')

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    })

    try {
      await transporter.sendMail({
        from: cfg.from,
        to,
        subject: 'EMAS – Test Email',
        text: 'This is a test email from your EMAS system email configuration. If you received this, your SMTP settings are working correctly.',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#1e293b;margin:0 0 16px">Test Email ✓</h2>
            <p style="color:#475569;margin:0 0 12px">This is a test email from your <strong>EMAS</strong> system email configuration.</p>
            <p style="color:#475569;margin:0">If you received this, your SMTP settings are working correctly.</p>
          </div>
        `,
      })
    } catch (err) {
      throw new BadRequestException(`SMTP error: ${(err as Error).message}`)
    }

    return { success: true }
  }
}
