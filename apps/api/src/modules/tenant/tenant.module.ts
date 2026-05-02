import { Module } from '@nestjs/common'
import { TenantController } from './tenant.controller'
import { TenantService } from './tenant.service'
import { TenancyModule } from './tenancy.module'

@Module({
  imports: [TenancyModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
