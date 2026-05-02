import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { RoleService } from './role.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreateRoleAutomationDto,
  UpdateRoleAutomationDto,
  TriggerRoleAutomationDto,
} from './dto/role.dto'

@ApiTags('role')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // ─── Roles ────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'List roles' })
  listRoles(@CurrentTenant() tenant: TenantContext): Promise<unknown[]> {
    return this.roleService.listRoles(tenant.id)
  }

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Create role' })
  createRole(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateRoleDto): Promise<unknown> {
    return this.roleService.createRole(tenant.id, dto)
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Get role by ID' })
  getRole(@CurrentTenant() tenant: TenantContext, @Param('id') id: string): Promise<unknown> {
    return this.roleService.getRole(tenant.id, id)
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Update role' })
  updateRole(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateRoleDto): Promise<unknown> {
    return this.roleService.updateRole(tenant.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Delete role' })
  deleteRole(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.roleService.deleteRole(tenant.id, id)
  }

  // ─── Automations ──────────────────────────────────────────────────────────

  @Get('automation/list')
  @UseGuards(RbacGuard)
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'List role automations' })
  listAutomations(@CurrentTenant() tenant: TenantContext): Promise<unknown[]> {
    return this.roleService.listAutomations(tenant.id)
  }

  @Post('automation')
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Create role automation rule' })
  createAutomation(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateRoleAutomationDto): Promise<unknown> {
    return this.roleService.createAutomation(tenant.id, dto)
  }

  @Patch('automation/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Update role automation' })
  updateAutomation(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateRoleAutomationDto): Promise<unknown> {
    return this.roleService.updateAutomation(tenant.id, id, dto)
  }

  @Delete('automation/:id')
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Delete role automation' })
  deleteAutomation(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.roleService.deleteAutomation(tenant.id, id)
  }

  @Post('automation/trigger')
  @UseGuards(RbacGuard)
  @RequirePermission('role.write')
  @ApiOperation({ summary: 'Trigger role automation for a user' })
  trigger(@CurrentTenant() tenant: TenantContext, @Body() dto: TriggerRoleAutomationDto) {
    return this.roleService.triggerAutomation(tenant.id, dto)
  }
}
