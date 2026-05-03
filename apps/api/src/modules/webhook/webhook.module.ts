import { Module } from '@nestjs/common'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { WebhookDispatcherService } from './webhook-dispatcher.service'
import { RbacGuard } from '../../common/guards/rbac.guard'

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDispatcherService, RbacGuard],
  exports: [WebhookDispatcherService],
})
export class WebhookModule {}
