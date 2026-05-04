import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRoleDto, UpdateProfileDto } from './dto/user.dto'

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
}
