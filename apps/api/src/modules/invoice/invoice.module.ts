import { Module } from '@nestjs/common'
import { InvoiceController } from './invoice.controller'
import { InvoiceService } from './invoice.service'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, RbacGuard, OwnerResolverService],
})
export class InvoiceModule {}
