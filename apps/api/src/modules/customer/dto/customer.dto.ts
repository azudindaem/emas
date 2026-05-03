import { Type } from 'class-transformer'
import { IsEmail, IsInt, IsObject, IsOptional, IsString, Min, ValidateIf } from 'class-validator'

export class ListCustomerQueryDto {
  @IsOptional()
  @IsString()
  search?: string

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

export class CustomerOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value !== null && value !== undefined)
  @IsEmail()
  email?: string

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>
}
