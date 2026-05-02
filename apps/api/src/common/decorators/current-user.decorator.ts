import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export interface JwtUser {
  userId: string
  tenantId: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtUser }>()
    return request.user
  },
)
