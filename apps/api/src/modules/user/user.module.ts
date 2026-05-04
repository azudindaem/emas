import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { InvitePublicController } from './invite-public.controller'
import { UserService } from './user.service'
import { RbacGuard } from '../../common/guards/rbac.guard'

@Module({
  controllers: [UserController, InvitePublicController],
  providers: [UserService, RbacGuard],
})
export class UserModule {}
