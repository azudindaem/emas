import {
  Body, Controller, Get, NotFoundException, Param,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { OrderService } from './order.service'
import {
  CreateOrderDto, ListOrderQueryDto,
  UpdateOrderStatusDto, UpdatePaymentStatusDto,
} from './dto/order.dto'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TenantContext } from '@emas/tenancy'
import type { JwtUser } from '../../common/decorators/current-user.decorator'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@ApiTags('order')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('order.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Query() query: ListOrderQueryDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.orderService.list(tenant.id, ownerId, query)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('order.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const order = await this.orderService.findOne(tenant.id, ownerId, id)
    if (!order) throw new NotFoundException('Order not found')
    return order
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('order.write')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateOrderDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.orderService.create(tenant.id, ownerId, dto)
  }

  @Patch(':id/status')
  @UseGuards(RbacGuard)
  @RequirePermission('order.status.write')
  async updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const updated = await this.orderService.updateStatus(tenant.id, ownerId, id, dto)
    if (!updated) throw new NotFoundException('Order not found')
    return updated
  }

  @Patch(':id/payment-status')
  @UseGuards(RbacGuard)
  @RequirePermission('order.payment.write')
  async updatePaymentStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const updated = await this.orderService.updatePaymentStatus(tenant.id, ownerId, id, dto)
    if (!updated) throw new NotFoundException('Order not found')
    return updated
  }
}
