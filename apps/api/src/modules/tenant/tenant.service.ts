import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { branding: true, subscription: true },
    }) as Promise<Record<string, unknown> | null>
  }
}
