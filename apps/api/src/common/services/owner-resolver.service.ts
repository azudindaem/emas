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
        select: { uplineId: true, level: true },
      })
      if (!membership) return currentUserId

      // If uplineId is set, walk up the chain
      if (membership.uplineId) {
        const uplineMembership = await this.prisma.membership.findFirst({
          where: { id: membership.uplineId },
          select: { userId: true },
        })
        if (!uplineMembership) return currentUserId
        currentUserId = uplineMembership.userId
        continue
      }

      // No uplineId: if this user is an owner (level >= 100) they ARE the root
      if (membership.level >= 100) return currentUserId

      // Team member with no uplineId (legacy row) — find the tenant root owner
      const ownerMembership = await this.prisma.membership.findFirst({
        where: { tenantId, uplineId: null, level: { gte: 100 } },
        orderBy: { level: 'desc' },
      })
      return ownerMembership ? ownerMembership.userId : currentUserId
    }
    return currentUserId
  }
}
