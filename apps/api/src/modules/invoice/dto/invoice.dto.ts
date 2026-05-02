import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'

export enum InvoiceTypeDto {
  SELLER = 'SELLER',
  CUSTOMER = 'CUSTOMER',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
}

export class ListInvoiceQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(InvoiceTypeDto)
  type?: InvoiceTypeDto

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

export class CreateInvoiceDto {
  @IsString()
  orderId: string

  @IsEnum(InvoiceTypeDto)
  type: InvoiceTypeDto

  @IsOptional()
  @IsString()
  pdfUrl?: string
}
