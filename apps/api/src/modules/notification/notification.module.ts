import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { RbacGuard } from '../../common/guards/rbac.guard'

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, RbacGuard],
})
export class NotificationModule {}
