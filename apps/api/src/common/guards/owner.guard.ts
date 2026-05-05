import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../modules/prisma/prisma.service'

/**
 * OwnerGuard – allows only Tier 1 (Super Admin) or Tier 2 (Super User / tenant owner).
 * Blocks Tier 3 Members.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getSuperAdminEmails(): string[] {
    const raw = this.config.get<string>('SYSTEM_OWNER_EMAILS', '')
    return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Tier 1 – Super Admin
    const superAdminEmails = this.getSuperAdminEmails()
    if (superAdminEmails.length > 0 && superAdminEmails.includes(membership.user.email.toLowerCase())) {
      return true
    }

    // Tier 2 – Super User (tenant owner)
    const permissions = Array.isArray(membership.role.permissions)
      ? membership.role.permissions.map((p) => String(p))
      : []
    const isSuperUser = membership.role.level >= 100 || permissions.includes('*')
    if (isSuperUser) return true

    throw new ForbiddenException('Owner access required')
  }
}
