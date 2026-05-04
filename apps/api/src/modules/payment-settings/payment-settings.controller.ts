import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PaymentSettingsService } from './payment-settings.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { UpsertPaymentGatewayDto, FetchChipPublicKeyDto } from './dto/payment-settings.dto'

@ApiTags('payment-settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payment-settings')
export class PaymentSettingsController {
  constructor(private readonly service: PaymentSettingsService) {}

  @Get()
  listAll(@CurrentTenant() tenant: TenantContext) {
    return this.service.listAll(tenant.id)
  }

  @Get(':gateway')
  getOne(@CurrentTenant() tenant: TenantContext, @Param('gateway') gateway: string) {
    return this.service.getOne(tenant.id, gateway)
  }

  @Put(':gateway')
  async upsert(
    @CurrentTenant() tenant: TenantContext,
    @Param('gateway') gateway: string,
    @Body() dto: UpsertPaymentGatewayDto,
  ) {
    await this.service.upsert(tenant.id, gateway, dto)
    return { success: true }
  }

  @Post('chip/public-key')
  fetchChipPublicKey(@Body() dto: FetchChipPublicKeyDto): Promise<{ publicKey: string }> {
    return this.service.fetchChipPublicKey(dto.secretKey, dto.environment ?? 'production')
      .then((publicKey) => ({ publicKey }))
  }
}
