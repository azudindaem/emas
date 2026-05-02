import {
  Body, Controller, Delete, Get, NotFoundException, Param,
  Patch, Post, Query, Res, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import type { Response } from 'express'
import { ProductService } from './product.service'
import {
  CreateProductDto, CreateVariationDto, ListProductQueryDto,
  UpdateProductDto, UpdateVariationDto,
} from './dto/product.dto'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TenantContext } from '@emas/tenancy'
import type { JwtUser } from '../../common/decorators/current-user.decorator'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@ApiTags('product')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('product.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Query() query: ListProductQueryDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.productService.list(tenant.id, ownerId, query)
  }

  @Get('summary')
  @UseGuards(RbacGuard)
  @RequirePermission('product.read')
  async summary(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtUser) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.productService.summary(tenant.id, ownerId)
  }

  @Get('categories')
  @UseGuards(RbacGuard)
  @RequirePermission('product.read')
  async categories(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtUser) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.productService.listCategories(tenant.id, ownerId)
  }

  @Get('export')
  @UseGuards(RbacGuard)
  @RequirePermission('product.read')
  async exportCsv(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const csv = await this.productService.exportCsv(tenant.id, ownerId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"')
    res.send(csv)
  }

  @Post('import')
  @UseGuards(RbacGuard)
  @RequirePermission('product.write')
  async importCsv(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() body: { csv: string },
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.productService.importCsv(tenant.id, ownerId, body.csv)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('product.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const product = await this.productService.findOne(tenant.id, ownerId, id)
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('product.write')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateProductDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.productService.create(tenant.id, ownerId, dto)
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('product.write')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const updated = await this.productService.update(tenant.id, ownerId, id, dto)
    if (!updated) throw new NotFoundException('Product not found')
    return updated
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('product.write')
  async remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const deleted = await this.productService.delete(tenant.id, ownerId, id)
    if (!deleted) throw new NotFoundException('Product not found')
    return { success: true }
  }

  @Post(':id/variations')
  @UseGuards(RbacGuard)
  @RequirePermission('product.variation.write')
  async createVariation(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') productId: string,
    @Body() dto: CreateVariationDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const variation = await this.productService.createVariation(tenant.id, ownerId, productId, dto)
    if (!variation) throw new NotFoundException('Product not found')
    return variation
  }

  @Patch(':id/variations/:variationId')
  @UseGuards(RbacGuard)
  @RequirePermission('product.variation.write')
  async updateVariation(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') productId: string,
    @Param('variationId') variationId: string,
    @Body() dto: UpdateVariationDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const variation = await this.productService.updateVariation(tenant.id, ownerId, productId, variationId, dto)
    if (!variation) throw new NotFoundException('Variation not found')
    return variation
  }

  @Delete(':id/variations/:variationId')
  @UseGuards(RbacGuard)
  @RequirePermission('product.variation.write')
  async deleteVariation(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') productId: string,
    @Param('variationId') variationId: string,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const deleted = await this.productService.deleteVariation(tenant.id, ownerId, productId, variationId)
    if (!deleted) throw new NotFoundException('Variation not found')
    return { success: true }
  }
}
