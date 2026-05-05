import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsPositive,
  IsInt,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CommissionType, CommissionValueType } from '@emas/db'

export class CreateCommissionRuleDto {
  @ApiProperty({ enum: CommissionType })
  @IsEnum(CommissionType)
  type: CommissionType

  @ApiProperty({ example: 'Level 1 Sales Commission' })
  @IsString()
  name: string

  @ApiProperty({ description: 'Rate value (percentage or fixed amount)', example: 5.0 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  value: number

  @ApiPropertyOptional({ enum: CommissionValueType, default: 'PERCENTAGE' })
  @IsOptional()
  @IsEnum(CommissionValueType)
  valueType?: CommissionValueType

  @ApiPropertyOptional({ description: 'Minimum downline level (for multi-level)', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minLevel?: number

  @ApiPropertyOptional({ description: 'Maximum downline level', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLevel?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateCommissionRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  type?: CommissionType

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  value?: number

  @ApiPropertyOptional({ enum: CommissionValueType })
  @IsOptional()
  @IsEnum(CommissionValueType)
  valueType?: CommissionValueType

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minLevel?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLevel?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class CalculateCommissionDto {
  @ApiProperty({ description: 'Order ID to calculate commission for' })
  @IsString()
  orderId: string
}

export class ListCommissionRulesQueryDto {
  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  type?: CommissionType

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean
}
