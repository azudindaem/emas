import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../modules/prisma/prisma.service'
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator'

/**
 * 3-tier permission hierarchy:
 *  Tier 1 – Super Admin   : SYSTEM_OWNER_EMAILS whitelist, platform-wide bypass
 *  Tier 2 – Super User    : Tenant owner (level >= 100 OR permissions = ['*']), tenant-wide bypass
 *  Tier 3 – Member        : level < 100, checked against specific permissions
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getSuperAdminEmails(): string[] {
    const raw = this.config.get<string>('SYSTEM_OWNER_EMAILS', '')
    return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  }

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
    if (!userId || !tenantId) throw new UnauthorizedException('Invalid user context')

    const membership = await this.prisma.membership.findFirst({
      where: { tenantId, userId },
      include: { role: true, user: true },
    })

    if (!membership) throw new ForbiddenException('No membership found for tenant')

    // Tier 1 – Super Admin (platform-wide whitelist)
    const superAdminEmails = this.getSuperAdminEmails()
    if (superAdminEmails.length > 0 && superAdminEmails.includes(membership.user.email.toLowerCase())) {
      return true
    }

    // Tier 2 – Super User (tenant owner: level >= 100 or wildcard permission)
    const permissions = Array.isArray(membership.role.permissions)
      ? membership.role.permissions.map((p) => String(p))
      : []
    const isSuperUser = membership.role.level >= 100 || permissions.includes('*')
    if (isSuperUser) return true

    // Tier 3 – Member: check specific permission
    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`)
    }

    return true
  }
}
