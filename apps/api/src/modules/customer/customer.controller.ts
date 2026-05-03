import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { JwtUser } from '../../common/decorators/current-user.decorator'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { OwnerResolverService } from '../../common/services/owner-resolver.service'
import type { TenantContext } from '@emas/tenancy'
import { CustomerService } from './customer.service'
import { CustomerOrdersQueryDto, ListCustomerQueryDto } from './dto/customer.dto'

@ApiTags('customer')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('order.read')
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListCustomerQueryDto,
  ) {
    return this.customerService.list(tenant.id, query)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('order.read')
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    const customer = await this.customerService.findOne(tenant.id, id)
    if (!customer) throw new NotFoundException('Customer not found')
    return customer
  }

  @Get(':id/orders')
  @UseGuards(RbacGuard)
  @RequirePermission('order.read')
  async orders(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query() query: CustomerOrdersQueryDto,
  ) {
    const ownerId = await this.ownerResolver.resolveOwnerId(tenant.id, user.userId)
    return this.customerService.listOrders(tenant.id, ownerId, id, query)
  }
}
