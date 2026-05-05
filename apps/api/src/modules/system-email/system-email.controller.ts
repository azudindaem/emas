import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { OwnerGuard } from '../../common/guards/owner.guard'
import { SystemEmailService } from './system-email.service'
import { UpsertSystemEmailDto, TestEmailDto } from './dto/system-email.dto'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { RbacGuard } from '../../common/guards/rbac.guard'

@ApiTags('system-email')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OwnerGuard, RbacGuard)
@Controller('system-email')
export class SystemEmailController {
  constructor(private readonly service: SystemEmailService) {}

  @Get()
  @RequirePermission('settings.email.read')
  getConfig(@CurrentTenant() tenant: TenantContext) {
    return this.service.getConfig(tenant.id)
  }

  @Put()
  @RequirePermission('settings.email.write')
  upsert(@CurrentTenant() tenant: TenantContext, @Body() dto: UpsertSystemEmailDto) {
    return this.service.upsert(tenant.id, dto)
  }

  @Post('test')
  @RequirePermission('settings.email.write')
  testEmail(@CurrentTenant() tenant: TenantContext, @Body() dto: TestEmailDto) {
    return this.service.testEmail(tenant.id, dto.to)
  }
}
