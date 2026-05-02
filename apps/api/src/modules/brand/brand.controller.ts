import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { BrandService } from './brand.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { CreateBrandDto, UpdateBrandDto, UpdateBrandingDto } from './dto/brand.dto'

@ApiTags('brand')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  // ─── Brands ───────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('brand.read')
  @ApiOperation({ summary: 'List brands' })
  list(@CurrentTenant() tenant: TenantContext): Promise<unknown[]> {
    return this.brandService.listBrands(tenant.id)
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('brand.write')
  @ApiOperation({ summary: 'Create brand' })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBrandDto): Promise<unknown> {
    return this.brandService.createBrand(tenant.id, dto)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('brand.read')
  @ApiOperation({ summary: 'Get brand by ID' })
  get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.brandService.getBrand(tenant.id, id)
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('brand.write')
  @ApiOperation({ summary: 'Update brand' })
  update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateBrandDto): Promise<unknown> {
    return this.brandService.updateBrand(tenant.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('brand.write')
  @ApiOperation({ summary: 'Delete brand' })
  delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.brandService.deleteBrand(tenant.id, id)
  }

  // ─── Tenant Branding ──────────────────────────────────────────────────────

  @Get('branding/config')
  @UseGuards(RbacGuard)
  @RequirePermission('brand.read')
  @ApiOperation({ summary: 'Get tenant white-label branding' })
  getBranding(@CurrentTenant() tenant: TenantContext): Promise<unknown> {
    return this.brandService.getBranding(tenant.id)
  }

  @Put('branding/config')
  @UseGuards(RbacGuard)
  @RequirePermission('brand.write')
  @ApiOperation({ summary: 'Update tenant white-label branding' })
  upsertBranding(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateBrandingDto): Promise<unknown> {
    return this.brandService.upsertBranding(tenant.id, dto)
  }
}
