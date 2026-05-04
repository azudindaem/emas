import { IsBoolean, IsObject, IsString, IsOptional } from 'class-validator'

export class UpsertPaymentGatewayDto {
  @IsBoolean()
  isEnabled: boolean

  @IsObject()
  config: Record<string, unknown>
}

export class FetchChipPublicKeyDto {
  @IsString()
  brandId: string

  @IsOptional()
  @IsString()
  environment?: string
}
