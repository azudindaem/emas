import { IsString, IsUrl, IsOptional, IsArray, IsBoolean } from 'class-validator'

export class CreateWebhookDto {
  @IsString()
  name: string

  @IsUrl()
  url: string

  @IsOptional()
  @IsString()
  secret?: string

  @IsArray()
  @IsString({ each: true })
  events: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class TestWebhookDto {
  @IsString()
  event: string
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsUrl()
  url?: string

  @IsOptional()
  @IsString()
  secret?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
