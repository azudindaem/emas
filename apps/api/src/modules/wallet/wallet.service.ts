import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletTransactionType } from '@emas/db'
import {
  CreditWalletDto,
  DebitWalletDto,
  TransferWalletDto,
  ListTransactionsQueryDto,
} from './dto/wallet.dto'
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get or create wallet ────────────────────────────────────────────────

  private async ensureWallet(tenantId: string, userId: string): Promise<{ id: string; balance: { toString(): string }; holdBalance: { toString(): string } } & Record<string, unknown>> {
    return this.prisma.wallet.upsert({
      where: { userId },
      create: { tenantId, userId, balance: 0, holdBalance: 0 },
      update: {},
    })
  }

  // ─── Balance ──────────────────────────────────────────────────────────────

  async getBalance(tenantId: string, userId: string): Promise<Record<string, unknown>> {
    const wallet = await this.ensureWallet(tenantId, userId)
    const balance = Number(wallet.balance)
    const holdBalance = Number(wallet.holdBalance)
    return {
      userId,
      walletId: wallet.id,
      balance,
      holdBalance,
      available: balance - holdBalance,
    }
  }

  async listBalances(tenantId: string): Promise<unknown[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { balance: 'desc' },
    })
    return wallets.map((w) => ({
      ...w,
      available: Number(w.balance) - Number(w.holdBalance),
    }))
  }

  // ─── Credit ────────────────────────────────────────────────────────────────

  async credit(tenantId: string, dto: CreditWalletDto): Promise<Record<string, unknown>> {
    const wallet = await this.ensureWallet(tenantId, dto.userId)
    const amount = dto.amount
    const balanceBefore = Number(wallet.balance)
    const balanceAfter = balanceBefore + amount

    const [updatedWallet, tx] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: dto.type ?? WalletTransactionType.CREDIT,
          amount,
          balanceBefore,
          balanceAfter,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      }),
    ])

    return { wallet: updatedWallet, transaction: tx }
  }

  // ─── Debit ─────────────────────────────────────────────────────────────────

  async debit(tenantId: string, dto: DebitWalletDto): Promise<Record<string, unknown>> {
    const wallet = await this.ensureWallet(tenantId, dto.userId)
    const amount = dto.amount
    const balanceBefore = Number(wallet.balance)
    const holdBalance = Number(wallet.holdBalance)

    if (balanceBefore - holdBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance')
    }

    const balanceAfter = balanceBefore - amount

    const [updatedWallet, tx] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: dto.type ?? WalletTransactionType.DEBIT,
          amount,
          balanceBefore,
          balanceAfter,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      }),
    ])

    return { wallet: updatedWallet, transaction: tx }
  }

  // ─── Transfer ──────────────────────────────────────────────────────────────

  async transfer(tenantId: string, dto: TransferWalletDto): Promise<Record<string, unknown>> {
    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('Cannot transfer to self')
    }

    const [fromWallet, toWallet] = await Promise.all([
      this.ensureWallet(tenantId, dto.fromUserId),
      this.ensureWallet(tenantId, dto.toUserId),
    ])

    const amount = dto.amount
    const fromBefore = Number(fromWallet.balance)
    const fromHold = Number(fromWallet.holdBalance)
    const toBefore = Number(toWallet.balance)

    if (fromBefore - fromHold < amount) {
      throw new BadRequestException('Insufficient wallet balance')
    }

    const [, , txOut, txIn] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: fromBefore - amount },
      }),
      this.prisma.wallet.update({
        where: { id: toWallet.id },
        data: { balance: toBefore + amount },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: fromWallet.id,
          type: WalletTransactionType.TRANSFER_OUT,
          amount,
          balanceBefore: fromBefore,
          balanceAfter: fromBefore - amount,
          note: dto.note,
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: toWallet.id,
          type: WalletTransactionType.TRANSFER_IN,
          amount,
          balanceBefore: toBefore,
          balanceAfter: toBefore + amount,
          note: dto.note,
        },
      }),
    ])

    return { sent: txOut, received: txIn }
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  async listTransactions(tenantId: string, query: ListTransactionsQueryDto): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const walletFilter = query.userId
      ? { userId: query.userId, tenantId }
      : { tenantId }

    const walletIds = (
      await this.prisma.wallet.findMany({
        where: walletFilter,
        select: { id: true },
      })
    ).map((w) => w.id)

    const where = {
      walletId: { in: walletIds },
      ...(query.type ? { type: query.type } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        include: { wallet: { select: { userId: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ])

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ─── Hold / Release (for pending payouts) ─────────────────────────────────

  async hold(tenantId: string, userId: string, amount: number): Promise<unknown> {
    const wallet = await this.ensureWallet(tenantId, userId)
    const available = Number(wallet.balance) - Number(wallet.holdBalance)
    if (available < amount) throw new BadRequestException('Insufficient available balance to hold')

    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { holdBalance: Number(wallet.holdBalance) + amount },
    })
  }

  async releaseHold(tenantId: string, userId: string, amount: number): Promise<unknown> {
    const wallet = await this.ensureWallet(tenantId, userId)
    const newHold = Number(wallet.holdBalance) - amount
    if (newHold < 0) throw new BadRequestException('Hold amount exceeds current hold balance')

    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { holdBalance: newHold },
    })
  }
}

