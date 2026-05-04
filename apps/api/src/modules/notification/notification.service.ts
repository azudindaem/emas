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

const PRICE_PER_MESSAGE = 0.08
const PROCESSING_FEE = 1.00
const CHIP_BASE_URL = 'https://gate.chip-in.asia'

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

  // ─── Payment-linked Top Up ────────────────────────────────────────────────

  async initiateTopUp(tenantId: string, dto: TopUpNotifyCreditDto) {
    const amount = dto.amount
    if (amount < 5) throw new BadRequestException('Minimum top up is RM 5')

    const total = amount + PROCESSING_FEE

    // Load SystemPaymentGatewayConfig CHIP for this tenant
    const chipConfig = await this.prisma.systemPaymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: 'CHIP' } },
    })
    if (!chipConfig || !chipConfig.isEnabled) {
      throw new BadRequestException('CHIP payment gateway is not configured. Please enable it in System > Payment Settings.')
    }

    const cfg = chipConfig.config as Record<string, unknown>
    const secretKey = String(cfg.secretKey ?? cfg.secret_key ?? '').trim()
    const brandId = String(cfg.brandId ?? cfg.brand_id ?? '').trim()
    if (!secretKey || !brandId) {
      throw new BadRequestException('CHIP brand_id / secret_key not set in System Payment Settings.')
    }

    // Get tenant info for CHIP client fields
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })

    const appBaseUrl = (process.env.APP_BASE_URL ?? process.env.ALLOWED_ORIGINS?.split(',')[0] ?? 'https://dev.emas.my').replace(/\/$/, '')
    const returnBase = `${appBaseUrl}/dashboard/notifications`

    const payload = {
      brand_id: brandId,
      reference: `NOTIFY-CREDIT-${tenantId.slice(0, 8)}-${Date.now()}`,
      client: {
        full_name: tenant?.name ?? 'Merchant',
        email: 'billing@no-email.local',
        phone: '',
      },
      purchase: {
        currency: 'MYR',
        products: [
          { name: `Emas Notify Credits RM ${amount.toFixed(2)}`, price: Math.round(amount * 100), quantity: 1 },
          { name: 'Processing Fee', price: Math.round(PROCESSING_FEE * 100), quantity: 1 },
        ],
      },
      platform: 'api',
      creator_agent: 'api',
      // success_redirect: purchaseId passed back via sessionStorage on the frontend
      success_redirect: `${returnBase}?topupRef=success`,
      failure_redirect: `${returnBase}?topupRef=failed`,
      cancel_redirect: `${returnBase}?topupRef=cancelled`,
    }

    const res = await fetch(`${CHIP_BASE_URL}/api/v1/purchases/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new BadRequestException(`CHIP create purchase failed ${res.status}: ${body}`)
    }
    const data = await res.json() as { checkout_url?: string; id?: string }
    const checkoutUrl = String(data.checkout_url ?? '').trim()
    const purchaseId = String(data.id ?? '').trim()
    if (!checkoutUrl) throw new BadRequestException('CHIP purchase created without checkout URL')

    // Save PENDING transaction
    const credit = await this.ensureCredit(tenantId)
    const balanceBefore = Number(credit.balance)

    await this.prisma.notifyCreditTransaction.create({
      data: {
        creditId: credit.id,
        type: NotifyCreditTransactionType.TOPUP,
        amount,
        balanceBefore,
        balanceAfter: balanceBefore, // unchanged until verified
        processingFee: PROCESSING_FEE,
        referenceId: purchaseId,
        note: `Top up RM ${amount.toFixed(2)} via CHIP`,
        status: 'PENDING',
      },
    })

    return { checkoutUrl, purchaseId }
  }

  async verifyTopUp(tenantId: string, purchaseId: string) {
    if (!purchaseId) throw new BadRequestException('purchaseId is required')

    // Find the PENDING transaction
    const credit = await this.ensureCredit(tenantId)
    const tx = await this.prisma.notifyCreditTransaction.findFirst({
      where: { creditId: credit.id, referenceId: purchaseId, status: 'PENDING' },
    })
    if (!tx) {
      // Check if already completed
      const done = await this.prisma.notifyCreditTransaction.findFirst({
        where: { creditId: credit.id, referenceId: purchaseId, status: 'COMPLETED' },
      })
      if (done) return { status: 'already_credited', balance: Number(credit.balance) }
      throw new BadRequestException('No pending top-up found for this purchase')
    }

    // Load CHIP config to verify
    const chipConfig = await this.prisma.systemPaymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: 'CHIP' } },
    })
    if (!chipConfig) throw new BadRequestException('CHIP not configured')

    const cfg = chipConfig.config as Record<string, unknown>
    const secretKey = String(cfg.secretKey ?? cfg.secret_key ?? '').trim()

    // Query CHIP for purchase status
    const res = await fetch(`${CHIP_BASE_URL}/api/v1/purchases/${purchaseId}/`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!res.ok) throw new BadRequestException(`CHIP verify failed: ${res.status}`)
    const purchase = await res.json() as { status?: string; is_test?: boolean }

    if (purchase.status !== 'paid') {
      await this.prisma.notifyCreditTransaction.update({
        where: { id: tx.id },
        data: { status: purchase.status === 'cancelled' ? 'CANCELLED' : 'PENDING' },
      })
      return { status: purchase.status ?? 'pending', balance: Number(credit.balance) }
    }

    // Credit the balance
    const balanceBefore = Number(credit.balance)
    const balanceAfter = balanceBefore + Number(tx.amount)

    await this.prisma.$transaction([
      this.prisma.notifyCredit.update({
        where: { id: credit.id },
        data: { balance: balanceAfter },
      }),
      this.prisma.notifyCreditTransaction.update({
        where: { id: tx.id },
        data: { balanceBefore, balanceAfter, status: 'COMPLETED' },
      }),
    ])

    return {
      status: 'paid',
      balance: balanceAfter,
      messagesAdded: Math.floor(Number(tx.amount) / PRICE_PER_MESSAGE),
    }
  }

  // ─── Notify Config ────────────────────────────────────────────────────────

  async getNotifyConfig(tenantId: string) {
    const config = await this.prisma.notifyConfig.findUnique({ where: { tenantId } })
    return config ?? {
      isEnabled: false,
      spamPrevention: true,
      triggerNewOrder: true,
      triggerInTransit: true,
    }
  }

  async updateNotifyConfig(tenantId: string, dto: { isEnabled?: boolean; spamPrevention?: boolean; triggerNewOrder?: boolean; triggerInTransit?: boolean }) {
    return this.prisma.notifyConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    })
  }
}
