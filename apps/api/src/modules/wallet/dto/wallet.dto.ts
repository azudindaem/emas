import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { WalletTransactionType } from '@emas/db'

export class CreditWalletDto {
  @ApiProperty({ description: 'User ID to credit wallet for' })
  @IsString()
  userId: string

  @ApiProperty({ example: 50.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number

  @ApiPropertyOptional({ enum: WalletTransactionType, default: 'CREDIT' })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType

  @ApiPropertyOptional({ example: 'Top-up by admin' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional({ description: 'External reference ID (order, payment, etc.)' })
  @IsOptional()
  @IsString()
  referenceId?: string
}

export class DebitWalletDto {
  @ApiProperty({ description: 'User ID to debit wallet for' })
  @IsString()
  userId: string

  @ApiProperty({ example: 20.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number

  @ApiPropertyOptional({ enum: WalletTransactionType, default: 'DEBIT' })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string
}

export class TransferWalletDto {
  @ApiProperty({ description: 'Sender user ID' })
  @IsString()
  fromUserId: string

  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  toUserId: string

  @ApiProperty({ example: 10.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}

export class ListTransactionsQueryDto {
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

  @ApiPropertyOptional({ enum: WalletTransactionType })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string
}
