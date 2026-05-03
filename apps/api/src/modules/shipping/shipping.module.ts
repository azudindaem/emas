import { Module } from '@nestjs/common'
import { ShippingController } from './shipping.controller'
import { ShippingService } from './shipping.service'
import { WebhookModule } from '../webhook/webhook.module'

@Module({
  imports: [WebhookModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
