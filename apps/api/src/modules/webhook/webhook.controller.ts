import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { WebhookService } from './webhook.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto } from './dto/webhook.dto'

@ApiTags('webhook')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.read')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.webhookService.list(tenant.id)
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.write')
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateWebhookDto) {
    return this.webhookService.create(tenant.id, dto)
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.write')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.update(tenant.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.write')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.webhookService.delete(tenant.id, id)
  }

  @Post(':id/toggle')
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.write')
  toggle(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.webhookService.toggle(tenant.id, id)
  }

  @Post(':id/test')
  @UseGuards(RbacGuard)
  @RequirePermission('notification.config.write')
  test(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: TestWebhookDto) {
    return this.webhookService.test(tenant.id, id, dto)
  }
}
