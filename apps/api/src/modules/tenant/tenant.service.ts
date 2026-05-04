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
