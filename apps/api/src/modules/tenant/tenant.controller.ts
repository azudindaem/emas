import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { TenantService } from './tenant.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'

@ApiTags('tenant')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async getCurrent(@CurrentTenant() tenant: TenantContext): Promise<Record<string, unknown> | null> {
    return this.tenantService.findOne(tenant.id)
  }
}
