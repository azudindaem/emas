import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { TenantService, type SystemMode } from './tenant.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import { OwnerGuard } from '../../common/guards/owner.guard'
import type { TenantContext } from '@emas/tenancy'
import type { Request } from 'express'

@ApiTags('tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // Public — no auth required, resolves tenant from host via TenantMiddleware
  @Get('system-mode/status')
  async getSystemModePublic(@Req() req: Request & { tenant?: TenantContext }): Promise<{ mode: SystemMode }> {
    return this.tenantService.getSystemMode(req.tenant!.id)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getCurrent(@CurrentTenant() tenant: TenantContext): Promise<Record<string, unknown> | null> {
    return this.tenantService.findOne(tenant.id)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('system-mode')
  async getSystemMode(@CurrentTenant() tenant: TenantContext): Promise<{ mode: SystemMode }> {
    return this.tenantService.getSystemMode(tenant.id)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OwnerGuard)
  @Patch('system-mode')
  async setSystemMode(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: { mode: SystemMode },
  ): Promise<{ mode: SystemMode }> {
    return this.tenantService.setSystemMode(tenant.id, body.mode)
  }
}
