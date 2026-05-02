import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../modules/prisma/prisma.service'
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator'

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredPermission) return true

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

    if (!permissions.includes(requiredPermission) && !permissions.includes('*')) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`)
    }

    return true
  }
}
