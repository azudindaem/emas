import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreateRoleAutomationDto,
  UpdateRoleAutomationDto,
  TriggerRoleAutomationDto,
} from './dto/role.dto'

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Roles ────────────────────────────────────────────────────────────────

  async listRoles(tenantId: string): Promise<unknown[]> {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' },
      include: { _count: { select: { memberships: true } } },
    })
  }

  async createRole(tenantId: string, dto: CreateRoleDto): Promise<unknown> {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        permissions: dto.permissions ?? [],
      },
    })
  }

  async getRole(tenantId: string, id: string): Promise<unknown> {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } })
    if (!role) throw new NotFoundException('Role not found')
    return role
  }

  async updateRole(tenantId: string, id: string, dto: UpdateRoleDto): Promise<unknown> {
    await this.getRole(tenantId, id)
    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        permissions: dto.permissions,
        isDefault: dto.isDefault,
      },
    })
  }

  async deleteRole(tenantId: string, id: string) {
    await this.getRole(tenantId, id)
    await this.prisma.role.delete({ where: { id } })
    return { success: true }
  }

  // ─── Role Automations ─────────────────────────────────────────────────────

  async listAutomations(tenantId: string): Promise<unknown[]> {
    return this.prisma.roleAutomation.findMany({
      where: { tenantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createAutomation(tenantId: string, dto: CreateRoleAutomationDto): Promise<unknown> {
    // verify role belongs to tenant
    await this.getRole(tenantId, dto.roleId)

    return this.prisma.roleAutomation.create({
      data: {
        tenantId,
        name: dto.name,
        trigger: dto.trigger,
        condition: dto.condition ? (dto.condition as object) : {},
        roleId: dto.roleId,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateAutomation(tenantId: string, id: string, dto: UpdateRoleAutomationDto): Promise<unknown> {
    const automation = await this.prisma.roleAutomation.findFirst({ where: { id, tenantId } })
    if (!automation) throw new NotFoundException('Automation not found')

    return this.prisma.roleAutomation.update({
      where: { id },
      data: {
        name: dto.name,
        trigger: dto.trigger,
        condition: dto.condition ? (dto.condition as object) : undefined,
        roleId: dto.roleId,
        isActive: dto.isActive,
      },
    })
  }

  async deleteAutomation(tenantId: string, id: string) {
    const automation = await this.prisma.roleAutomation.findFirst({ where: { id, tenantId } })
    if (!automation) throw new NotFoundException('Automation not found')
    await this.prisma.roleAutomation.delete({ where: { id } })
    return { success: true }
  }

  async triggerAutomation(tenantId: string, dto: TriggerRoleAutomationDto) {
    // find active automations that match the event trigger
    const automations = await this.prisma.roleAutomation.findMany({
      where: { tenantId, trigger: dto.event, isActive: true },
      include: { role: true },
    })

    const assigned: string[] = []
    for (const automation of automations) {
      // simple condition check: all condition keys must match context
      const condition = automation.condition as Record<string, unknown>
      const ctx = dto.context ?? {}
      const matches = Object.entries(condition).every(([k, v]) => ctx[k] === v)

      if (matches) {
        // assign role to user via membership update
        await this.prisma.membership.updateMany({
          where: { tenantId, userId: dto.userId },
          data: { roleId: automation.roleId },
        })
        assigned.push(automation.role.name)
      }
    }

    return { triggered: automations.length, assigned }
  }
}
