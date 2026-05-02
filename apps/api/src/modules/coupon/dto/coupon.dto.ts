import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  code: string

  @ApiPropertyOptional({ enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrderAmount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDiscount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usageLimit?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrderAmount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDiscount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usageLimit?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  code: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderAmount?: number
}
