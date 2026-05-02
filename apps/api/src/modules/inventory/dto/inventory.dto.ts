import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export enum StockMovementTypeDto {
  IN = 'IN',
  OUT = 'OUT',
  RESERVED = 'RESERVED',
  RELEASED = 'RELEASED',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class ListStockQueryDto {
  @IsOptional()
  @IsString()
  variationId?: string

  @IsOptional()
  @IsString()
  warehouseId?: string
}

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  variationId: string

  @IsOptional()
  @IsString()
  warehouseId?: string

  @IsInt()
  @Min(1)
  quantity: number

  @IsEnum(StockMovementTypeDto)
  type: StockMovementTypeDto

  @IsOptional()
  @IsString()
  referenceId?: string

  @IsOptional()
  @IsString()
  note?: string
}

export class ReserveStockDto {
  @IsString()
  @IsNotEmpty()
  variationId: string

  @IsOptional()
  @IsString()
  warehouseId?: string

  @IsInt()
  @Min(1)
  quantity: number

  @IsOptional()
  @IsString()
  referenceId?: string

  @IsOptional()
  @IsString()
  note?: string
}

export class ReleaseStockDto {
  @IsString()
  @IsNotEmpty()
  variationId: string

  @IsOptional()
  @IsString()
  warehouseId?: string

  @IsInt()
  @Min(1)
  quantity: number

  @IsOptional()
  @IsString()
  referenceId?: string

  @IsOptional()
  @IsString()
  note?: string
}
