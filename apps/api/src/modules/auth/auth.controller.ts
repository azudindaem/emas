import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'

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
}
