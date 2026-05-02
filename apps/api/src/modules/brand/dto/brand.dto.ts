import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBrandDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateBrandDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  logoUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string

  @ApiPropertyOptional()
  @IsOptional()
  logoUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  faviconUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailHeader?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string
}
