import { Module } from '@nestjs/common'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'
import { WebhookModule } from '../webhook/webhook.module'
import { ShippingModule } from '../shipping/shipping.module'
import { InventoryModule } from '../inventory/inventory.module'
import { CommissionModule } from '../commission/commission.module'

@Module({
  imports: [WebhookModule, ShippingModule, InventoryModule, CommissionModule],
  controllers: [OrderController],
  providers: [OrderService, RbacGuard, OwnerResolverService],
})
export class OrderModule {}
