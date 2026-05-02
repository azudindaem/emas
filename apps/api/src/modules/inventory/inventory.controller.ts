import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TenantContext } from '@emas/tenancy'
import type { JwtUser } from '../../common/decorators/current-user.decorator'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import {
  AdjustStockDto,
  ListStockQueryDto,
  ReleaseStockDto,
  ReserveStockDto,
} from './dto/inventory.dto'
import { InventoryService } from './inventory.service'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  @Get('stocks')
  @UseGuards(RbacGuard)
  @RequirePermission('inventory.read')
  async listStocks(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Query() query: ListStockQueryDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.inventoryService.listStocks(tenant.id, ownerId, query)
  }

  @Post('stocks/adjust')
  @UseGuards(RbacGuard)
  @RequirePermission('inventory.write')
  async adjustStock(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: AdjustStockDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.inventoryService.adjustStock(tenant.id, ownerId, dto)
  }

  @Post('stocks/reserve')
  @UseGuards(RbacGuard)
  @RequirePermission('inventory.reserve')
  async reserveStock(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: ReserveStockDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.inventoryService.reserveStock(tenant.id, ownerId, dto)
  }

  @Post('stocks/release')
  @UseGuards(RbacGuard)
  @RequirePermission('inventory.reserve')
  async releaseStock(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: ReleaseStockDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.inventoryService.releaseStock(tenant.id, ownerId, dto)
  }

  @Get('movements')
  @UseGuards(RbacGuard)
  @RequirePermission('inventory.read')
  async movementLogs(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Query('variationId') variationId?: string,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.inventoryService.movementLogs(tenant.id, ownerId, variationId)
  }
}
