import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  permissions?: string[]
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  permissions?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}

export class CreateRoleAutomationDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty({ description: 'Trigger event: user.register | order.complete | membership.upgrade' })
  @IsString()
  trigger: string

  @ApiPropertyOptional({ description: 'Conditions to match (e.g. { "plan": "pro" })' })
  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>

  @ApiProperty({ description: 'Role ID to assign when triggered' })
  @IsString()
  roleId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateRoleAutomationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trigger?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class TriggerRoleAutomationDto {
  @ApiProperty({ description: 'Event name: user.register | order.complete | membership.upgrade' })
  @IsString()
  event: string

  @ApiProperty()
  @IsString()
  userId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>
}
