import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { UserService } from './user.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { AssignRoleDto, CreateRoleDto } from './dto/user.dto'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('members')
  @UseGuards(RbacGuard)
  @RequirePermission('team.members.read')
  listMembers(@CurrentTenant() tenant: TenantContext) {
    return this.userService.listMembers(tenant.id)
  }

  @Get('roles')
  @UseGuards(RbacGuard)
  @RequirePermission('team.roles.read')
  listRoles(@CurrentTenant() tenant: TenantContext) {
    return this.userService.listRoles(tenant.id)
  }

  @Post('roles')
  @UseGuards(RbacGuard)
  @RequirePermission('team.roles.write')
  createRole(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateRoleDto) {
    return this.userService.createRole(tenant.id, dto)
  }

  @Patch('members/:membershipId/role')
  @UseGuards(RbacGuard)
  @RequirePermission('team.roles.assign')
  async assignRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId') membershipId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const updated = await this.userService.assignRole(tenant.id, membershipId, dto.roleId)
    if (!updated) {
      throw new NotFoundException('Membership or role not found')
    }
    return updated
  }
}
