import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../modules/prisma/prisma.service'

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getSystemOwnerEmails(): string[] {
    const raw = this.config.get<string>('SYSTEM_OWNER_EMAILS', '')
    return raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  }

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
      include: { role: true, user: true },
    })

    if (!membership) {
      throw new ForbiddenException('No membership found for tenant')
    }

    const permissions = Array.isArray(membership.role.permissions)
      ? membership.role.permissions.map((p) => String(p))
      : []

    const isOwner = permissions.includes('*') || membership.role.level >= 100
    const systemOwnerEmails = this.getSystemOwnerEmails()
    const isSystemOwnerFromList = systemOwnerEmails.includes(
      membership.user.email.toLowerCase(),
    )
    const isSystemOwner =
      systemOwnerEmails.length > 0 ? isSystemOwnerFromList : isOwner

    if (!isSystemOwner) {
      throw new ForbiddenException('System owner access required')
    }

    return true
  }
}
