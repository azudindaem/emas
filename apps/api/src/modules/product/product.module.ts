import { Module } from '@nestjs/common'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@Module({
  controllers: [ProductController],
  providers: [ProductService, RbacGuard, OwnerResolverService],
})
export class ProductModule {}
