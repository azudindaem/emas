import { Module } from '@nestjs/common'
import { SystemEmailController } from './system-email.controller'
import { SystemEmailService } from './system-email.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SystemEmailController],
  providers: [SystemEmailService],
  exports: [SystemEmailService],
})
export class SystemEmailModule {}
