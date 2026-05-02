import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

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
