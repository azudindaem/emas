import { Module } from '@nestjs/common'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@Module({
  controllers: [OrderController],
  providers: [OrderService, RbacGuard, OwnerResolverService],
})
export class OrderModule {}
