import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { RbacGuard } from '../../common/guards/rbac.guard'

@Module({
  controllers: [UserController],
  providers: [UserService, RbacGuard],
})
export class UserModule {}
