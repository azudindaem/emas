import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { AiService } from './ai.service'
import { TransformTextDto } from './dto/ai.dto'

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('text/transform')
  @ApiOperation({ summary: 'Transform text using local AI (rewrite, summarize, translate, improve)' })
  transformText(@CurrentTenant() tenant: TenantContext, @Body() dto: TransformTextDto) {
    return this.aiService.transformText(tenant.id, dto)
  }
}
