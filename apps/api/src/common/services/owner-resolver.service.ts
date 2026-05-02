import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../modules/prisma/prisma.service'

@Injectable()
export class OwnerResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the "root owner" userId for a given user in a tenant.
   * If no uplineId in membership → user IS the owner.
   * If uplineId exists → walk up to find the root owner.
   * Depth capped at 10 to avoid loops.
   */
  async resolveOwnerId(tenantId: string, userId: string): Promise<string> {
    let currentUserId = userId
    for (let depth = 0; depth < 10; depth++) {
      const membership = await this.prisma.membership.findFirst({
        where: { tenantId, userId: currentUserId },
        select: { uplineId: true },
      })
      if (!membership || !membership.uplineId) {
        return currentUserId
      }
      const uplineMembership = await this.prisma.membership.findFirst({
        where: { id: membership.uplineId },
        select: { userId: true },
      })
      if (!uplineMembership) {
        return currentUserId
      }
      currentUserId = uplineMembership.userId
    }
    return currentUserId
  }
}
