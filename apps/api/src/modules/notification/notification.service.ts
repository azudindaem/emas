import { Injectable, BadRequestException } from '@nestjs/common'
import { OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@emas/db'
import { NotifyCreditTransactionType } from '@emas/db'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import {
  NotificationChannelDto,
  SendNotificationDto,
  TopUpNotifyCreditDto,
  UpsertNotificationConfigDto,
} from './dto/notification.dto'

const PRICE_PER_MESSAGE = 0.80
const PROCESSING_FEE = 1.00

@Injectable()
export class NotificationService implements OnModuleDestroy {
  private readonly redis = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  })

  private readonly queue = new Queue('notification', {
    connection: this.redis,
  })

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    await this.queue.close()
    await this.redis.quit()
  }

  async listConfigs(tenantId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.notificationConfig.findMany({
      where: { tenantId },
      orderBy: { channel: 'asc' },
    })

    return rows as unknown as Record<string, unknown>[]
  }

  async upsertConfig(
    tenantId: string,
    dto: UpsertNotificationConfigDto,
  ): Promise<Record<string, unknown>> {
    const row = await this.prisma.notificationConfig.upsert({
      where: {
        tenantId_channel: {
          tenantId,
          channel: dto.channel,
        },
      },
      create: {
        tenantId,
        channel: dto.channel,
        settings: dto.settings as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
      update: {
        settings: dto.settings as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    })

    return row as unknown as Record<string, unknown>
  }

  async send(tenantId: string, dto: SendNotificationDto): Promise<Record<string, unknown>> {
    const job = await this.queue.add(
      'send',
      {
        tenantId,
        channel: dto.channel,
        recipient: dto.recipient,
        templateId: dto.templateId,
        subject: dto.subject,
        variables: dto.variables,
      },
      {
        attempts: 3,
        removeOnComplete: 200,
        removeOnFail: 200,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    )

    return {
      queued: true,
      jobId: job.id,
      queue: 'notification',
    }
  }

  // ─── Notify Credits ───────────────────────────────────────────────────────

  private async ensureCredit(tenantId: string) {
    return this.prisma.notifyCredit.upsert({
      where: { tenantId },
      create: { tenantId, balance: 0 },
      update: {},
    })
  }

  async getCreditBalance(tenantId: string) {
    const credit = await this.ensureCredit(tenantId)
    const balance = Number(credit.balance)
    return {
      balance,
      messagesRemaining: Math.floor(balance / PRICE_PER_MESSAGE),
      pricePerMessage: PRICE_PER_MESSAGE,
    }
  }

  async topUpCredit(tenantId: string, dto: TopUpNotifyCreditDto) {
    const amount = dto.amount
    if (amount <= 0) throw new BadRequestException('Amount must be greater than 0')

    const credit = await this.ensureCredit(tenantId)
    const balanceBefore = Number(credit.balance)
    const balanceAfter = balanceBefore + amount

    const [updatedCredit, tx] = await this.prisma.$transaction([
      this.prisma.notifyCredit.update({
        where: { id: credit.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.notifyCreditTransaction.create({
        data: {
          creditId: credit.id,
          type: NotifyCreditTransactionType.TOPUP,
          amount,
          balanceBefore,
          balanceAfter,
          processingFee: PROCESSING_FEE,
          note: `Top up RM ${amount.toFixed(2)}`,
          status: 'COMPLETED',
        },
      }),
    ])

    return {
      balance: Number(updatedCredit.balance),
      transaction: tx,
      messagesAdded: Math.floor(amount / PRICE_PER_MESSAGE),
    }
  }

  async listCreditTransactions(tenantId: string, take = 20, skip = 0) {
    const credit = await this.prisma.notifyCredit.findUnique({ where: { tenantId } })
    if (!credit) return { transactions: [], total: 0 }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.notifyCreditTransaction.findMany({
        where: { creditId: credit.id },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notifyCreditTransaction.count({ where: { creditId: credit.id } }),
    ])

    return { transactions, total }
  }

  async debitCredit(tenantId: string, amount: number, referenceId?: string, note?: string) {
    const credit = await this.ensureCredit(tenantId)
    const balanceBefore = Number(credit.balance)
    if (balanceBefore < amount) throw new BadRequestException('Insufficient Emas Notify credits')

    const balanceAfter = balanceBefore - amount

    await this.prisma.$transaction([
      this.prisma.notifyCredit.update({
        where: { id: credit.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.notifyCreditTransaction.create({
        data: {
          creditId: credit.id,
          type: NotifyCreditTransactionType.DEBIT,
          amount,
          balanceBefore,
          balanceAfter,
          referenceId,
          note: note ?? 'Message sent',
          status: 'COMPLETED',
        },
      }),
    ])
  }
}
