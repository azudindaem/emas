import { Module } from '@nestjs/common'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, RbacGuard, OwnerResolverService],
})
export class CustomerModule {}
