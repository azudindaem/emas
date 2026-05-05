import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as crypto from 'crypto'
import * as nodemailer from 'nodemailer'
import { CreateRoleDto, InviteMemberDto, AcceptInviteDto, UpdateProfileDto } from './dto/user.dto'

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string, userId: string): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        icNumber: true,
        dateOfBirth: true,
        gender: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        state: true,
        country: true,
      },
    })

    if (!user) return null

    return {
      ...user,
      displayName: user.name,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    }
  }

  async updateProfile(
    tenantId: string,
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Record<string, unknown> | null> {
    const existing = await this.prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!existing) return null

    const clean = (value?: string): string | null | undefined => {
      if (typeof value === 'undefined') return undefined
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }

    const data: Record<string, unknown> = {}

    const displayName = clean(dto.displayName)
    if (typeof displayName !== 'undefined') data.name = displayName ?? existing.name

    const firstName = clean(dto.firstName)
    if (typeof firstName !== 'undefined') data.firstName = firstName

    const lastName = clean(dto.lastName)
    if (typeof lastName !== 'undefined') data.lastName = lastName

    const phone = clean(dto.phone)
    if (typeof phone !== 'undefined') data.phone = phone

    const avatarUrl = clean(dto.avatarUrl)
    if (typeof avatarUrl !== 'undefined') data.avatarUrl = avatarUrl

    const icNumber = clean(dto.icNumber)
    if (typeof icNumber !== 'undefined') data.icNumber = icNumber

    const addressLine1 = clean(dto.addressLine1)
    if (typeof addressLine1 !== 'undefined') data.addressLine1 = addressLine1

    const addressLine2 = clean(dto.addressLine2)
    if (typeof addressLine2 !== 'undefined') data.addressLine2 = addressLine2

    const postalCode = clean(dto.postalCode)
    if (typeof postalCode !== 'undefined') data.postalCode = postalCode

    const city = clean(dto.city)
    if (typeof city !== 'undefined') data.city = city

    const state = clean(dto.state)
    if (typeof state !== 'undefined') data.state = state

    const country = clean(dto.country)
    if (typeof country !== 'undefined') data.country = country

    if (typeof dto.dateOfBirth !== 'undefined') {
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null
    }

    if (typeof dto.gender !== 'undefined') {
      data.gender = dto.gender
    }

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        icNumber: true,
        dateOfBirth: true,
        gender: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        state: true,
        country: true,
      },
    })

    return {
      ...updated,
      displayName: updated.name,
      dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
    }
  }

  async listMembers(tenantId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: true,
        role: true,
      },
      orderBy: { joinedAt: 'desc' },
    })

    return rows as unknown as Record<string, unknown>[]
  }

  async listRoles(tenantId: string): Promise<Record<string, unknown>[]> {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
    })
    return roles as unknown as Record<string, unknown>[]
  }

  async createRole(tenantId: string, dto: CreateRoleDto): Promise<Record<string, unknown>> {
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        level: dto.level ?? 1,
        permissions: dto.permissions ?? [],
      },
    })

    return role as unknown as Record<string, unknown>
  }

  async assignRole(
    tenantId: string,
    membershipId: string,
    roleId: string,
  ): Promise<Record<string, unknown> | null> {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } })
    if (!role) return null

    const membership = await this.prisma.membership.findFirst({ where: { id: membershipId, tenantId } })
    if (!membership) return null

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        roleId,
        level: role.level,
      },
      include: { user: true, role: true },
    })

    return updated as unknown as Record<string, unknown>
  }

  async removeMember(tenantId: string, membershipId: string, requestingUserId: string) {
    const membership = await this.prisma.membership.findFirst({ where: { id: membershipId, tenantId }, include: { user: true } })
    if (!membership) throw new NotFoundException('Member not found')
    if (membership.user.id === requestingUserId) throw new BadRequestException('You cannot remove yourself')
    await this.prisma.membership.delete({ where: { id: membershipId } })
    return { success: true }
  }

  async inviteMember(tenantId: string, invitedByUserId: string, dto: InviteMemberDto) {
    // Check not already a member
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } })
    if (existing) throw new ConflictException('User is already a member of this team')

    // Check role exists
    const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, tenantId } })
    if (!role) throw new NotFoundException('Role not found')

    // Get system email config
    const emailCfg = await this.prisma.systemEmailConfig.findUnique({ where: { tenantId } })
    if (!emailCfg || !emailCfg.isEnabled) {
      throw new BadRequestException('System email not configured. Please set up SMTP in System Email settings.')
    }

    // Invalidate previous pending invites for same email
    await this.prisma.teamInvite.updateMany({
      where: { tenantId, email: dto.email, acceptedAt: null },
      data: { expiresAt: new Date() }, // expire them
    })

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    const invite = await this.prisma.teamInvite.create({
      data: { tenantId, email: dto.email, roleId: dto.roleId, invitedByUserId, expiresAt },
      include: { role: true, invitedByUser: true },
    })

    // Get tenant branding for email
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const tenantName = tenant?.name ?? 'EMAS'
    const inviterName = invite.invitedByUser.name

    // Build accept URL — use the request's domain (same as tenant domain)
    const domain = await this.prisma.tenantDomain.findFirst({ where: { tenantId, isPrimary: true } })
    const baseUrl = domain ? `https://${domain.domain}` : 'https://emas.my'
    const acceptUrl = `${baseUrl}/accept-invite/${invite.token}`

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
        subject: `Jemputan ke ${tenantName} — EMAS`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#1e293b;margin:0 0 8px">Anda dijemput!</h2>
            <p style="color:#475569;margin:0 0 16px"><strong>${inviterName}</strong> telah menjemput anda untuk menyertai pasukan <strong>${tenantName}</strong> sebagai <strong>${invite.role.name}</strong>.</p>
            <p style="color:#475569;margin:0 0 24px">Klik butang di bawah untuk menerima jemputan. Jemputan ini sah selama <strong>48 jam</strong>.</p>
            <a href="${acceptUrl}" style="display:inline-block;background:#d4a017;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;">Terima Jemputan</a>
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">Atau salin pautan ini: <br/>${acceptUrl}</p>
            <p style="color:#cbd5e1;font-size:11px;margin:12px 0 0">Jika anda tidak mengharapkan jemputan ini, abaikan e-mel ini.</p>
          </div>
        `,
      })
    } catch (err) {
      // Delete invite if email fails
      await this.prisma.teamInvite.delete({ where: { id: invite.id } })
      throw new BadRequestException(`Failed to send invite email: ${(err as Error).message}`)
    }

    return {
      id: invite.id,
      email: invite.email,
      role: { id: role.id, name: role.name },
      expiresAt: invite.expiresAt,
    }
  }

  async listInvites(tenantId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.teamInvite.findMany({
      where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { role: true, invitedByUser: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return rows as unknown as Record<string, unknown>[]
  }

  async cancelInvite(tenantId: string, inviteId: string) {
    const invite = await this.prisma.teamInvite.findFirst({ where: { id: inviteId, tenantId } })
    if (!invite) throw new NotFoundException('Invite not found')
    await this.prisma.teamInvite.delete({ where: { id: inviteId } })
    return { success: true }
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
      include: { role: true, tenant: { select: { name: true } } },
    })
    if (!invite) throw new NotFoundException('Invalid invite link')
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted')
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired')
    return {
      email: invite.email,
      role: invite.role.name,
      tenantName: invite.tenant.name,
      expiresAt: invite.expiresAt,
    }
  }

  async acceptInvite(dto: AcceptInviteDto) {    const invite = await this.prisma.teamInvite.findUnique({
      where: { token: dto.token },
      include: { role: true },
    })
    if (!invite) throw new NotFoundException('Invalid invite link')
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted')
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired')

    const tenantId = invite.tenantId

    // Check email not already member
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: invite.email } })
    if (existing) throw new ConflictException('Email already registered in this team')

    const passwordHash = crypto.createHash('sha256').update(dto.password).digest('hex')

    const user = await this.prisma.user.create({
      data: { tenantId, name: dto.name, email: invite.email, passwordHash },
    })

    // Find the root owner membership so resolveOwnerId() can walk up to the owner's data
    const ownerMembership = await this.prisma.membership.findFirst({
      where: { tenantId, uplineId: null },
      orderBy: { level: 'desc' },
    })

    await this.prisma.membership.create({
      data: { tenantId, userId: user.id, roleId: invite.roleId, level: invite.role.level, uplineId: ownerMembership?.id ?? null },
    })

    await this.prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })

    return { success: true, email: invite.email }
  }

  // List all subscribers (workspace owners) across every tenant — Super Admin use
  async listAllSubscribers(requestingUserId: string) {
    // Get all memberships where level >= 100 (Owner of their workspace)
    const rows = await this.prisma.membership.findMany({
      where: { level: { gte: 100 } },
      include: {
        user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
        role: { select: { name: true, level: true } },
        tenant: { select: { id: true, name: true, slug: true, createdAt: true } },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return rows.map((r) => ({
      membershipId: r.id,
      workspaceId: r.tenant.id,
      workspaceName: r.tenant.name,
      workspaceSlug: r.tenant.slug,
      workspaceCreatedAt: r.tenant.createdAt,
      userId: r.user.id,
      name: r.user.name,
      email: r.user.email,
      status: r.user.status,
      role: r.role.name,
      level: r.role.level,
      joinedAt: r.joinedAt,
    }))
  }
}

