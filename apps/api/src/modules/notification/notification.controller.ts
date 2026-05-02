import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { NotificationService } from './notification.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { SendNotificationDto, UpsertNotificationConfigDto } from './dto/notification.dto'

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
}
