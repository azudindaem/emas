import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { InvoiceService } from './invoice.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TenantContext } from '@emas/tenancy'
import type { JwtUser } from '../../common/decorators/current-user.decorator'
import { CreateInvoiceDto, ListInvoiceQueryDto } from './dto/invoice.dto'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'

@ApiTags('invoice')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('invoice.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Query() query: ListInvoiceQueryDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.invoiceService.list(tenant.id, ownerId, query)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('invoice.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const invoice = await this.invoiceService.findOne(tenant.id, ownerId, id)
    if (!invoice) throw new NotFoundException('Invoice not found')
    return invoice
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('invoice.write')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    const invoice = await this.invoiceService.create(tenant.id, ownerId, dto)
    if (!invoice) throw new NotFoundException('Order not found')
    return invoice
  }
}
