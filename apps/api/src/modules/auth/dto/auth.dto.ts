import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

export class RegisterDto {
  @IsString()
  name: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  @MinLength(8)
  passwordConfirm: string

  @IsString()
  tac: string
}

export class SendTacDto {
  @IsEmail()
  email: string
}

export class VerifyTacDto {
  @IsEmail()
  email: string

  @IsString()
  code: string
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string
}
