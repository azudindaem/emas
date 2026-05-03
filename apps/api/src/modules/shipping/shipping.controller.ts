import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ShippingService } from './shipping.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import {
  CreateCourierAccountDto,
  UpdateCourierAccountDto,
  GenerateAwbDto,
  BulkGenerateAwbDto,
  UpdateShipmentStatusDto,
  TrackShipmentDto,
  GetRateDto,
  ListShipmentsQueryDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  CreateShippingRateDto,
  UpdateShippingRateDto,
  UpdateShippingDefaultSettingDto,
} from './dto/shipping.dto'

@ApiTags('shipping')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ─── Courier Accounts ────────────────────────────────────────────────────

  @Get('couriers')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'List courier accounts' })
  listCourierAccounts(@CurrentTenant() tenant: TenantContext): Promise<unknown[]> {
    return this.shippingService.listCourierAccounts(tenant.id)
  }

  @Post('couriers')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Add a courier account' })
  createCourierAccount(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCourierAccountDto): Promise<unknown> {
    return this.shippingService.createCourierAccount(tenant.id, dto)
  }

  @Get('couriers/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'Get courier account by ID' })
  getCourierAccount(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.shippingService.getCourierAccount(tenant.id, id)
  }

  @Patch('couriers/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Update courier account' })
  updateCourierAccount(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCourierAccountDto,
  ): Promise<unknown> {
    return this.shippingService.updateCourierAccount(tenant.id, id, dto)
  }

  @Delete('couriers/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Delete courier account' })
  deleteCourierAccount(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.shippingService.deleteCourierAccount(tenant.id, id)
  }

  // ─── Rates ────────────────────────────────────────────────────────────────

  @Post('rates')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'Get shipping rates (stub)' })
  getRates(@CurrentTenant() tenant: TenantContext, @Body() dto: GetRateDto) {
    return this.shippingService.getRates(tenant.id, dto)
  }

  // ─── AWB ──────────────────────────────────────────────────────────────────

  @Post('awb')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Generate AWB for a single order (stub)' })
  generateAwb(@CurrentTenant() tenant: TenantContext, @Body() dto: GenerateAwbDto) {
    return this.shippingService.generateAwb(tenant.id, dto)
  }

  @Post('awb/bulk')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Bulk generate AWB for multiple orders (stub)' })
  bulkGenerateAwb(@CurrentTenant() tenant: TenantContext, @Body() dto: BulkGenerateAwbDto) {
    return this.shippingService.bulkGenerateAwb(tenant.id, dto)
  }

  // ─── Shipments ────────────────────────────────────────────────────────────

  @Get('shipments')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'List shipments with pagination' })
  listShipments(@CurrentTenant() tenant: TenantContext, @Query() query: ListShipmentsQueryDto) {
    return this.shippingService.listShipments(tenant.id, query)
  }

  @Get('shipments/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'Get shipment detail' })
  getShipment(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.shippingService.getShipment(tenant.id, id)
  }

  @Patch('shipments/:id/status')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Update shipment status manually' })
  updateShipmentStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shippingService.updateShipmentStatus(tenant.id, id, dto)
  }

  @Post('shipments/:id/cancel')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Cancel AWB and mark shipment as cancelled' })
  cancelAwb(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.shippingService.cancelAwb(tenant.id, id)
  }

  @Post('shipments/:id/label')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Generate shipping label for a shipment (stub)' })
  generateLabel(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.shippingService.generateLabel(tenant.id, id)
  }

  // ─── Tracking ─────────────────────────────────────────────────────────────

  @Post('track')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'Track shipment by AWB (stub)' })
  trackShipment(@CurrentTenant() tenant: TenantContext, @Body() dto: TrackShipmentDto) {
    return this.shippingService.trackShipment(tenant.id, dto)
  }

  // ─── Webhooks ─────────────────────────────────────────────────────────────

  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Courier webhook receiver (no auth required)' })
  handleWebhook(@Param('provider') provider: string, @Body() payload: Record<string, unknown>) {
    return this.shippingService.handleWebhook(provider, payload)
  }

  // ─── Shipping Zones ──────────────────────────────────────────────────────

  @Get('zones')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'List shipping zones' })
  listShippingZones(@CurrentTenant() tenant: TenantContext): Promise<unknown[]> {
    return this.shippingService.listShippingZones(tenant.id)
  }

  @Post('zones')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Create shipping zone' })
  createShippingZone(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateShippingZoneDto): Promise<unknown> {
    return this.shippingService.createShippingZone(tenant.id, dto)
  }

  @Patch('zones/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Update shipping zone' })
  updateShippingZone(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateShippingZoneDto,
  ): Promise<unknown> {
    return this.shippingService.updateShippingZone(tenant.id, id, dto)
  }

  @Delete('zones/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Delete shipping zone' })
  deleteShippingZone(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.shippingService.deleteShippingZone(tenant.id, id)
  }

  // ─── Shipping Rates ──────────────────────────────────────────────────────

  @Get('zones/:zoneId/rates')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'List rates for a shipping zone' })
  listShippingRates(@CurrentTenant() tenant: TenantContext, @Param('zoneId') zoneId: string): Promise<unknown[]> {
    return this.shippingService.listShippingRates(tenant.id, zoneId)
  }

  @Post('zones/:zoneId/rates')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Add rate to a shipping zone' })
  createShippingRate(
    @CurrentTenant() tenant: TenantContext,
    @Param('zoneId') zoneId: string,
    @Body() dto: CreateShippingRateDto,
  ): Promise<unknown> {
    return this.shippingService.createShippingRate(tenant.id, zoneId, dto)
  }

  @Patch('zones/:zoneId/rates/:rateId')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Update a shipping rate' })
  updateShippingRate(
    @CurrentTenant() tenant: TenantContext,
    @Param('zoneId') zoneId: string,
    @Param('rateId') rateId: string,
    @Body() dto: UpdateShippingRateDto,
  ): Promise<unknown> {
    return this.shippingService.updateShippingRate(tenant.id, zoneId, rateId, dto)
  }

  @Delete('zones/:zoneId/rates/:rateId')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Delete a shipping rate' })
  deleteShippingRate(
    @CurrentTenant() tenant: TenantContext,
    @Param('zoneId') zoneId: string,
    @Param('rateId') rateId: string,
  ): Promise<unknown> {
    return this.shippingService.deleteShippingRate(tenant.id, zoneId, rateId)
  }

  // ─── Default Settings ────────────────────────────────────────────────────

  @Get('settings/defaults')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.read')
  @ApiOperation({ summary: 'Get shipping default settings' })
  getShippingDefaults(@CurrentTenant() tenant: TenantContext): Promise<unknown> {
    return this.shippingService.getShippingDefaults(tenant.id)
  }

  @Patch('settings/defaults')
  @UseGuards(RbacGuard)
  @RequirePermission('shipping.write')
  @ApiOperation({ summary: 'Update shipping default settings' })
  updateShippingDefaults(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateShippingDefaultSettingDto): Promise<unknown> {
    return this.shippingService.updateShippingDefaults(tenant.id, dto)
  }
}

