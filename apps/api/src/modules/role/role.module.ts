import { Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { RoleController } from './role.controller'
import { RoleService } from './role.service'
import { PermissionsController } from './permissions.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule, DiscoveryModule],
  controllers: [RoleController, PermissionsController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
