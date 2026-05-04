import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import type { Request } from 'express'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @CurrentTenant() tenant: TenantContext) {
    return this.auth.login(dto, tenant.id)
  }

  @Post('register')
  register(@Body() dto: RegisterDto, @CurrentTenant() tenant: TenantContext) {
    return this.auth.register(dto, tenant.id)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshTokens(dto.refreshToken)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(
    @Req() req: Request & { user?: { userId: string; tenantId: string } },
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.auth.getMe(req.user!.userId, tenant.id)
  }
}
