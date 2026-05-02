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
import { CommissionService } from './commission.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  CalculateCommissionDto,
  ListCommissionRulesQueryDto,
} from './dto/commission.dto'

@ApiTags('commission')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // ─── Rules ────────────────────────────────────────────────────────────────

  @Get('rules')
  @UseGuards(RbacGuard)
  @RequirePermission('commission.read')
  @ApiOperation({ summary: 'List commission rules' })
  listRules(@CurrentTenant() tenant: TenantContext, @Query() query: ListCommissionRulesQueryDto): Promise<unknown[]> {
    return this.commissionService.listRules(tenant.id, query)
  }

  @Post('rules')
  @UseGuards(RbacGuard)
  @RequirePermission('commission.write')
  @ApiOperation({ summary: 'Create a commission rule' })
  createRule(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCommissionRuleDto): Promise<unknown> {
    return this.commissionService.createRule(tenant.id, dto)
  }

  @Get('rules/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('commission.read')
  @ApiOperation({ summary: 'Get commission rule by ID' })
  getRule(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.commissionService.getRule(tenant.id, id)
  }

  @Patch('rules/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('commission.write')
  @ApiOperation({ summary: 'Update a commission rule' })
  updateRule(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ): Promise<unknown> {
    return this.commissionService.updateRule(tenant.id, id, dto)
  }

  @Delete('rules/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('commission.write')
  @ApiOperation({ summary: 'Delete a commission rule' })
  deleteRule(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.commissionService.deleteRule(tenant.id, id)
  }

  // ─── Calculate & Distribute ───────────────────────────────────────────────

  @Post('calculate')
  @UseGuards(RbacGuard)
  @RequirePermission('commission.write')
  @ApiOperation({ summary: 'Calculate and distribute commission for an order' })
  calculate(@CurrentTenant() tenant: TenantContext, @Body() dto: CalculateCommissionDto) {
    return this.commissionService.calculateAndDistribute(tenant.id, dto)
  }
}

