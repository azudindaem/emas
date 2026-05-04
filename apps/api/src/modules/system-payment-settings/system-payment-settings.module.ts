import { Module } from '@nestjs/common'
import { SystemPaymentSettingsController } from './system-payment-settings.controller'
import { SystemPaymentSettingsService } from './system-payment-settings.service'
import { OwnerGuard } from '../../common/guards/owner.guard'

@Module({
  controllers: [SystemPaymentSettingsController],
  providers: [SystemPaymentSettingsService, OwnerGuard],
})
export class SystemPaymentSettingsModule {}
