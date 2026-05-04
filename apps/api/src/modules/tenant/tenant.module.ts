import { Module } from '@nestjs/common'
import { TenantController } from './tenant.controller'
import { TenantService } from './tenant.service'
import { TenancyModule } from './tenancy.module'
import { OwnerGuard } from '../../common/guards/owner.guard'

@Module({
  imports: [TenancyModule],
  controllers: [TenantController],
  providers: [TenantService, OwnerGuard],
})
export class TenantModule {}
