import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator'

export enum NotificationChannelDto {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP_OFFICIAL = 'WHATSAPP_OFFICIAL',
  WHATSAPP_UNOFFICIAL = 'WHATSAPP_UNOFFICIAL',
  WEBHOOK = 'WEBHOOK',
}

export class UpsertNotificationConfigDto {
  @IsEnum(NotificationChannelDto)
  channel: NotificationChannelDto

  @IsObject()
  settings: Record<string, unknown>

  @IsOptional()
  isActive?: boolean
}

export class SendNotificationDto {
  @IsEnum(NotificationChannelDto)
  channel: NotificationChannelDto

  @IsString()
  @IsNotEmpty()
  recipient: string

  @IsString()
  @IsNotEmpty()
  templateId: string

  @IsOptional()
  @IsString()
  subject?: string

  @IsObject()
  variables: Record<string, string>
}

export class TopUpNotifyCreditDto {
  @IsNumber()
  @Min(1)
  amount: number
}

export class VerifyTopUpDto {
  @IsString()
  @IsNotEmpty()
  purchaseId: string
}

export class UpdateNotifyConfigDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  spamPrevention?: boolean

  @IsOptional()
  @IsBoolean()
  triggerNewOrder?: boolean

  @IsOptional()
  @IsBoolean()
  triggerInTransit?: boolean
}
