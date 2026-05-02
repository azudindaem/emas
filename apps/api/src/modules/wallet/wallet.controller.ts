import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { WalletService } from './wallet.service'
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator'
import type { TenantContext } from '@emas/tenancy'
import { RbacGuard } from '../../common/guards/rbac.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import {
  CreditWalletDto,
  DebitWalletDto,
  TransferWalletDto,
  ListTransactionsQueryDto,
} from './dto/wallet.dto'

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balances')
  @UseGuards(RbacGuard)
  @RequirePermission('wallet.read')
  @ApiOperation({ summary: 'List all member wallet balances' })
  listBalances(@CurrentTenant() tenant: TenantContext) {
    return this.walletService.listBalances(tenant.id)
  }

  @Get('balance/:userId')
  @UseGuards(RbacGuard)
  @RequirePermission('wallet.read')
  @ApiOperation({ summary: 'Get wallet balance for a user' })
  getBalance(@CurrentTenant() tenant: TenantContext, @Param('userId') userId: string) {
    return this.walletService.getBalance(tenant.id, userId)
  }

  @Post('credit')
  @UseGuards(RbacGuard)
  @RequirePermission('wallet.write')
  @ApiOperation({ summary: 'Credit a user wallet' })
  credit(@CurrentTenant() tenant: TenantContext, @Body() dto: CreditWalletDto) {
    return this.walletService.credit(tenant.id, dto)
  }

  @Post('debit')
  @UseGuards(RbacGuard)
  @RequirePermission('wallet.write')
  @ApiOperation({ summary: 'Debit a user wallet' })
  debit(@CurrentTenant() tenant: TenantContext, @Body() dto: DebitWalletDto) {
    return this.walletService.debit(tenant.id, dto)
  }

  @Post('transfer')
  @UseGuards(RbacGuard)
  @RequirePermission('wallet.write')
  @ApiOperation({ summary: 'Transfer between two user wallets' })
  transfer(@CurrentTenant() tenant: TenantContext, @Body() dto: TransferWalletDto) {
    return this.walletService.transfer(tenant.id, dto)
  }

  @Get('transactions')
  @UseGuards(RbacGuard)
  @RequirePermission('wallet.read')
  @ApiOperation({ summary: 'List wallet transactions with pagination' })
  listTransactions(@CurrentTenant() tenant: TenantContext, @Query() query: ListTransactionsQueryDto) {
    return this.walletService.listTransactions(tenant.id, query)
  }
}

