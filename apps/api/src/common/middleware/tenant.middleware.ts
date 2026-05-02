import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { TenantResolver } from '@emas/tenancy'

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantResolver: TenantResolver) {}

  async use(req: Request & { tenant?: unknown }, _res: Response, next: NextFunction) {
    const host = req.hostname
    const tenant = await this.tenantResolver.resolveFromHost(host)

    if (!tenant) {
      throw new UnauthorizedException('Unknown tenant')
    }

    req.tenant = tenant
    next()
  }
}
