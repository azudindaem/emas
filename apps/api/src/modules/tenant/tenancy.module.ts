import { Module } from '@nestjs/common'
import { TenantResolver } from '@emas/tenancy'

@Module({
  providers: [TenantResolver],
  exports: [TenantResolver],
})
export class TenancyModule {}
