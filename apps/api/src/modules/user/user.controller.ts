import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { UserService } from './user.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { AcceptInviteDto, AssignRoleDto, CreateRoleDto, InviteMemberDto, UpdateProfileDto } from './dto/user.dto'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { Request } from 'express'

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(
    @CurrentTenant() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    const profile = await this.userService.getProfile(tenant.id, req.user!.userId)
    if (!profile) throw new NotFoundException('User profile not found')
    return profile
  }

  @Patch('profile')
  async updateProfile(
    @CurrentTenant() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.userService.updateProfile(tenant.id, req.user!.userId, dto)
    if (!profile) throw new NotFoundException('User profile not found')
    return profile
  }

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

  @Delete('members/:membershipId')
  @UseGuards(RbacGuard)
  @RequirePermission('team.members.write')
  removeMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId') membershipId: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    // Prevent removing yourself
    return this.userService.removeMember(tenant.id, membershipId, req.user.userId)
  }

  @Post('invite')
  @UseGuards(RbacGuard)
  @RequirePermission('team.invite.send')
  inviteMember(
    @CurrentTenant() tenant: TenantContext,
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: InviteMemberDto,
  ) {
    return this.userService.inviteMember(tenant.id, req.user.userId, dto)
  }

  @Get('invites')
  @UseGuards(RbacGuard)
  @RequirePermission('team.members.read')
  listInvites(@CurrentTenant() tenant: TenantContext) {
    return this.userService.listInvites(tenant.id)
  }

  @Delete('invites/:inviteId')
  @UseGuards(RbacGuard)
  @RequirePermission('team.invite.send')
  cancelInvite(@CurrentTenant() tenant: TenantContext, @Param('inviteId') inviteId: string) {
    return this.userService.cancelInvite(tenant.id, inviteId)
  }
}
