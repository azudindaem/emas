import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export enum ProductStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateVariationDto {
  @IsString()
  @IsNotEmpty()
  sku: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsNumber()
  @Min(0)
  price: number

  @IsNumber()
  @Min(0)
  weight: number

  @IsOptional()
  @IsString()
  imageUrl?: string
}

export class UpdateVariationDto {
  @IsOptional()
  @IsString()
  sku?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number

  @IsOptional()
  @IsString()
  imageUrl?: string
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  brandId?: string

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariationDto)
  variations?: CreateVariationDto[]
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  sku?: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  brandId?: string

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto
}

export class ListProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20
}
