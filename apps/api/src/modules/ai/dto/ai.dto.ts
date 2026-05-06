import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export const AI_TEXT_TASKS = ['rewrite', 'summarize', 'translate', 'improve'] as const

export type AiTextTask = (typeof AI_TEXT_TASKS)[number]

export class TransformTextDto {
  @ApiProperty({ enum: AI_TEXT_TASKS })
  @IsIn(AI_TEXT_TASKS)
  task: AiTextTask

  @ApiProperty({ description: 'Input text to transform', maxLength: 10000 })
  @IsString()
  @MaxLength(10000)
  text: string

  @ApiPropertyOptional({ description: 'Tone style for rewrite/improve, e.g. formal, friendly, concise' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  tone?: string

  @ApiPropertyOptional({ description: 'Target language for translate, e.g. ms, en, zh' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string

  @ApiPropertyOptional({ description: 'Output length control', enum: ['short', 'medium', 'long'] })
  @IsOptional()
  @IsIn(['short', 'medium', 'long'])
  length?: 'short' | 'medium' | 'long'
}
