import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../modules/prisma/prisma.service'

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { userId?: string; tenantId?: string }
    }>()

    const userId = request.user?.userId
    const tenantId = request.user?.tenantId
    if (!userId || !tenantId) {
      throw new UnauthorizedException('Invalid user context')
    }

    const membership = await this.prisma.membership.findFirst({
      where: { tenantId, userId },
      include: { role: true },
    })

    if (!membership) {
      throw new ForbiddenException('No membership found for tenant')
    }

    const permissions = Array.isArray(membership.role.permissions)
      ? membership.role.permissions.map((p) => String(p))
      : []

    const isOwner = permissions.includes('*') || membership.role.level >= 100

    if (!isOwner) {
      throw new ForbiddenException('Owner access required')
    }

    return true
  }
}
