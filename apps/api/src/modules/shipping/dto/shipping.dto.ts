import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CourierProvider, ShipmentStatus } from '@emas/db'

// ─── Courier Account ─────────────────────────────────────────────────────────

export class CreateCourierAccountDto {
  @ApiProperty({ enum: CourierProvider })
  @IsEnum(CourierProvider)
  provider: CourierProvider

  @ApiProperty({ example: 'NinjaVan Main' })
  @IsString()
  label: string

  @ApiProperty({ example: { apiKey: 'xxx', secret: 'yyy' } })
  @IsObject()
  credentials: Record<string, unknown>
}

export class UpdateCourierAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ─── Shipment ─────────────────────────────────────────────────────────────────

export class GenerateAwbDto {
  @ApiProperty({ description: 'Order ID to generate AWB for' })
  @IsString()
  orderId: string

  @ApiProperty({ description: 'CourierAccount ID to use' })
  @IsString()
  courierAccountId: string

  @ApiPropertyOptional({ description: 'Override service type (e.g. express, economy)' })
  @IsOptional()
  @IsString()
  serviceType?: string

  @ApiPropertyOptional({ description: 'Parcel weight in kg' })
  @IsOptional()
  @IsNumber()
  weightKg?: number

  @ApiPropertyOptional({ description: 'Additional notes to courier' })
  @IsOptional()
  @IsString()
  notes?: string
}

export class BulkGenerateAwbDto {
  @ApiProperty({ type: [String], description: 'Array of Order IDs' })
  @IsArray()
  @IsString({ each: true })
  orderIds: string[]

  @ApiProperty({ description: 'CourierAccount ID to use' })
  @IsString()
  courierAccountId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceType?: string
}

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  awbNo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labelUrl?: string
}

export class TrackShipmentDto {
  @ApiProperty({ description: 'AWB number to track' })
  @IsString()
  awbNo: string

  @ApiProperty({ description: 'CourierAccount ID' })
  @IsString()
  courierAccountId: string
}

// ─── Rate Query ───────────────────────────────────────────────────────────────

export class GetRateDto {
  @ApiProperty({ description: 'Origin postcode' })
  @IsString()
  fromPostcode: string

  @ApiProperty({ description: 'Destination postcode' })
  @IsString()
  toPostcode: string

  @ApiProperty({ description: 'Weight in kg' })
  @IsNumber()
  weightKg: number

  @ApiPropertyOptional({ enum: CourierProvider, description: 'Filter by specific courier' })
  @IsOptional()
  @IsEnum(CourierProvider)
  provider?: CourierProvider
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export class CourierWebhookDto {
  @ApiPropertyOptional()
  awbNo?: string

  @ApiPropertyOptional()
  status?: string

  @ApiPropertyOptional()
  timestamp?: string

  @ApiPropertyOptional()
  description?: string
}

// ─── List Query ───────────────────────────────────────────────────────────────

export class ListShipmentsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number

  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string
}
