import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpsertSystemEmailDto {
  @IsString()
  @IsNotEmpty()
  host: string

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number

  @IsBoolean()
  secure: boolean

  @IsString()
  @IsNotEmpty()
  user: string

  @IsString()
  @IsNotEmpty()
  pass: string

  @IsString()
  @IsNotEmpty()
  from: string

  @IsBoolean()
  isEnabled: boolean
}

export class TestEmailDto {
  @IsEmail()
  to: string
}
