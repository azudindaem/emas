import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRoleDto } from './dto/user.dto'

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
