import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export enum StockMovementTypeDto {
  IN = 'IN',
  OUT = 'OUT',
  RESERVED = 'RESERVED',
  RELEASED = 'RELEASED',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class ListStockQueryDto {
  @IsOptional() @IsString() variationId?: string
  @IsOptional() @IsString() warehouseId?: string
  @IsOptional() @IsString() search?: string
  @IsOptional() @Type(() => Number) @IsInt() page?: number
  @IsOptional() @Type(() => Number) @IsInt() limit?: number
}

export class ListMovementQueryDto {
  @IsOptional() @IsString() variationId?: string
  @IsOptional() @IsString() type?: string
  @IsOptional() @Type(() => Number) @IsInt() page?: number
  @IsOptional() @Type(() => Number) @IsInt() limit?: number
}

export class AdjustStockDto {
  @IsString() @IsNotEmpty() variationId: string
  @IsOptional() @IsString() warehouseId?: string
  @IsInt() @Min(1) quantity: number
  @IsEnum(StockMovementTypeDto) type: StockMovementTypeDto
  @IsOptional() @IsString() referenceId?: string
  @IsOptional() @IsString() note?: string
}

export class ReserveStockDto {
  @IsString() @IsNotEmpty() variationId: string
  @IsOptional() @IsString() warehouseId?: string
  @IsInt() @Min(1) quantity: number
  @IsOptional() @IsString() referenceId?: string
  @IsOptional() @IsString() note?: string
}

export class ReleaseStockDto {
  @IsString() @IsNotEmpty() variationId: string
  @IsOptional() @IsString() warehouseId?: string
  @IsInt() @Min(1) quantity: number
  @IsOptional() @IsString() referenceId?: string
  @IsOptional() @IsString() note?: string
}

export class CreateWarehouseDto {
  @IsString() @IsNotEmpty() name: string
  @IsOptional() @IsString() address?: string
  @IsOptional() isDefault?: boolean
}

export class UpdateWarehouseDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() address?: string
  @IsOptional() isDefault?: boolean
}
