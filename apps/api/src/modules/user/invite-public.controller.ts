import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { UserService } from './user.service'
import { AcceptInviteDto } from './dto/user.dto'

@ApiTags('invite')
@Controller('invite')
export class InvitePublicController {
  constructor(private readonly userService: UserService) {}

  @Get(':token')
  getInvite(@Param('token') token: string) {
    return this.userService.getInviteByToken(token)
  }

  @Post(':token/accept')
  acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    dto.token = token
    return this.userService.acceptInvite(dto)
  }
}
