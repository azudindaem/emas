import { IsArray, IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icNumber?: string

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER'

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string

}

export class InviteMemberDto {
  @IsEmail()
  email: string

  @IsString()
  @IsNotEmpty()
  roleId: string
}

export class AcceptInviteDto {
  @IsString()
  @IsOptional()
  token: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @MinLength(8)
  password: string
}
