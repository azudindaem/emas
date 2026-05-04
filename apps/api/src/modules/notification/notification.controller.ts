import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { NotificationService } from './notification.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { SendNotificationDto, TopUpNotifyCreditDto, UpsertNotificationConfigDto } from './dto/notification.dto'

@ApiTags('notification')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.read')
  listConfigs(@CurrentTenant() tenant: TenantContext) {
    return this.notificationService.listConfigs(tenant.id)
  }

  @Post('config')
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.write')
  upsertConfig(@CurrentTenant() tenant: TenantContext, @Body() dto: UpsertNotificationConfigDto) {
    return this.notificationService.upsertConfig(tenant.id, dto)
  }

  @Post('send')
  @UseGuards(RbacGuard)
  @RequirePermission('notification.send')
  send(@CurrentTenant() tenant: TenantContext, @Body() dto: SendNotificationDto) {
    return this.notificationService.send(tenant.id, dto)
  }

  // ─── Notify Credits ─────────────────────────────────────────────────────

  @Get('credit')
  getCreditBalance(@CurrentTenant() tenant: TenantContext) {
    return this.notificationService.getCreditBalance(tenant.id)
  }

  @Post('credit/topup')
  async topUpCredit(@CurrentTenant() tenant: TenantContext, @Body() dto: TopUpNotifyCreditDto): Promise<Record<string, unknown>> {
    return this.notificationService.topUpCredit(tenant.id, dto) as Promise<Record<string, unknown>>
  }

  @Get('credit/transactions')
  async listCreditTransactions(
    @CurrentTenant() tenant: TenantContext,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ): Promise<Record<string, unknown>> {
    return this.notificationService.listCreditTransactions(
      tenant.id,
      take ? parseInt(take) : 20,
      skip ? parseInt(skip) : 0,
    ) as Promise<Record<string, unknown>>
  }
}
