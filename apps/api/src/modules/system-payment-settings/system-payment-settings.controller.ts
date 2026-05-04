import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { OwnerGuard } from '../../common/guards/owner.guard'
import { UpsertPaymentGatewayDto, FetchChipPublicKeyDto } from '../payment-settings/dto/payment-settings.dto'
import { SystemPaymentSettingsService } from './system-payment-settings.service'

@ApiTags('system-payment-settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OwnerGuard)
@Controller('system-payment-settings')
export class SystemPaymentSettingsController {
  constructor(private readonly service: SystemPaymentSettingsService) {}

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
    return this.service.fetchChipPublicKey(dto.secretKey, dto.environment ?? 'production').then((publicKey) => ({ publicKey }))
  }
}
