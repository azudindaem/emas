import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto, RefreshTokenDto, SendTacDto, VerifyTacDto } from './dto/auth.dto'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import type { Request } from 'express'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  devLogin() {
    return this.auth.devLogin()
  }

  @Post('send-tac')
  @HttpCode(HttpStatus.OK)
  sendTac(@Body() dto: SendTacDto, @CurrentTenant() tenant: TenantContext) {
    return this.auth.sendTac(dto, tenant.id)
  }

  @Post('verify-tac')
  @HttpCode(HttpStatus.OK)
  verifyTac(@Body() dto: VerifyTacDto, @CurrentTenant() tenant: TenantContext) {
    return this.auth.verifyTac(dto, tenant.id)
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
  ) {
    // tenantId from JWT = user's own workspace (set at registration/login)
    return this.auth.getMe(req.user!.userId, req.user!.tenantId)
  }
}
