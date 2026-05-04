import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export type SystemMode = 'ACTIVE' | 'MAINTENANCE'

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { branding: true, subscription: true },
    }) as Promise<Record<string, unknown> | null>
  }

  async setSystemMode(tenantId: string, mode: SystemMode): Promise<{ mode: SystemMode }> {
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
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    })
    const mode = (tenant?.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE') as SystemMode
    return { mode }
  }
}
