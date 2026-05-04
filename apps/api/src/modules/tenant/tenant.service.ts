import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

export type SystemMode = 'ACTIVE' | 'MAINTENANCE'

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private isEnvMaintenanceEnabled(): boolean {
    return this.config.get<string>('SYSTEM_MAINTENANCE_MODE', 'off').toLowerCase() === 'on'
  }

  async findOne(id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { branding: true, subscription: true },
    }) as Promise<Record<string, unknown> | null>
  }

  async setSystemMode(tenantId: string, mode: SystemMode): Promise<{ mode: SystemMode }> {
    if (this.isEnvMaintenanceEnabled()) {
      throw new BadRequestException('System mode is locked by SYSTEM_MAINTENANCE_MODE=on')
    }

    if (mode !== 'ACTIVE' && mode !== 'MAINTENANCE') {
      throw new BadRequestException('Invalid mode. Must be ACTIVE or MAINTENANCE.')
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: mode },
    })
    return { mode }
  }

  async getSubscription(tenantId: string): Promise<Record<string, unknown>> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })
    return (subscription ?? {}) as Record<string, unknown>
  }

  async listPlans(): Promise<Record<string, unknown>[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })
    return plans as unknown as Record<string, unknown>[]
  }

  async createPlan(input: {
    code: string
    name: string
    priceMonthly: number
    priceYearly: number
    maxUsers?: number
    maxOrders?: number
    maxProducts?: number
    isActive?: boolean
  }): Promise<Record<string, unknown>> {
    const code = input.code?.trim().toUpperCase()
    const name = input.name?.trim()
    if (!code || !name) {
      throw new BadRequestException('Code and name are required')
    }

    const plan = await this.prisma.plan.create({
      data: {
        code,
        name,
        priceMonthly: Number(input.priceMonthly ?? 0),
        priceYearly: Number(input.priceYearly ?? 0),
        maxUsers: Number(input.maxUsers ?? 5),
        maxOrders: Number(input.maxOrders ?? 500),
        maxProducts: Number(input.maxProducts ?? 100),
        isActive: input.isActive ?? true,
      },
    })
    return plan as unknown as Record<string, unknown>
  }

  async updatePlan(
    id: string,
    input: {
      code?: string
      name?: string
      priceMonthly?: number
      priceYearly?: number
      maxUsers?: number
      maxOrders?: number
      maxProducts?: number
      isActive?: boolean
    },
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {}
    if (typeof input.code === 'string') data.code = input.code.trim().toUpperCase()
    if (typeof input.name === 'string') data.name = input.name.trim()
    if (typeof input.priceMonthly !== 'undefined') data.priceMonthly = Number(input.priceMonthly)
    if (typeof input.priceYearly !== 'undefined') data.priceYearly = Number(input.priceYearly)
    if (typeof input.maxUsers !== 'undefined') data.maxUsers = Number(input.maxUsers)
    if (typeof input.maxOrders !== 'undefined') data.maxOrders = Number(input.maxOrders)
    if (typeof input.maxProducts !== 'undefined') data.maxProducts = Number(input.maxProducts)
    if (typeof input.isActive !== 'undefined') data.isActive = Boolean(input.isActive)

    const plan = await this.prisma.plan.update({
      where: { id },
      data,
    })
    return plan as unknown as Record<string, unknown>
  }

  async getSystemMode(tenantId: string): Promise<{ mode: SystemMode }> {
    if (this.isEnvMaintenanceEnabled()) {
      return { mode: 'MAINTENANCE' }
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    })
    const mode = (tenant?.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE') as SystemMode
    return { mode }
  }
}
