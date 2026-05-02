import { Module } from '@nestjs/common'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, RbacGuard, OwnerResolverService],
})
export class InventoryModule {}
