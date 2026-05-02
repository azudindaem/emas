import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CouponService } from './coupon.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto'

@ApiTags('coupon')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('coupon.read')
  @ApiOperation({ summary: 'List coupons' })
  list(@CurrentTenant() tenant: TenantContext): Promise<unknown[]> {
    return this.couponService.list(tenant.id)
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('coupon.write')
  @ApiOperation({ summary: 'Create coupon' })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCouponDto): Promise<unknown> {
    return this.couponService.create(tenant.id, dto)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('coupon.read')
  @ApiOperation({ summary: 'Get coupon by ID' })
  get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.couponService.get(tenant.id, id)
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('coupon.write')
  @ApiOperation({ summary: 'Update coupon' })
  update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateCouponDto): Promise<unknown> {
    return this.couponService.update(tenant.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('coupon.write')
  @ApiOperation({ summary: 'Delete coupon' })
  delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.couponService.delete(tenant.id, id)
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate and calculate coupon discount' })
  validate(@CurrentTenant() tenant: TenantContext, @Body() dto: ValidateCouponDto): Promise<unknown> {
    return this.couponService.validate(tenant.id, dto)
  }
}
