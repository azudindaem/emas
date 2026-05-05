import type { Processor } from 'bullmq'
import { CommissionValueType, CommissionLogStatus, WalletTransactionType } from '@emas/db'
import { getPrisma } from '../lib/db'

export interface CommissionJob {
  tenantId: string
  orderId: string
  type: 'sales' | 'recruitment' | 'channel' | 'network' | 'point' | 'same_level'
}

export const commissionProcessor: Processor<CommissionJob> = async (job) => {
  const { tenantId, orderId } = job.data
  const prisma = getPrisma()

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true, total: true, createdById: true, status: true },
  })

  if (!order || !order.createdById) {
    console.log(`[commission] order ${orderId} not found or has no creator — skip`)
    return
  }

  // Idempotency: skip if already processed
  const existing = await prisma.commissionLog.findFirst({
    where: { orderId, tenantId, status: CommissionLogStatus.PAID },
  })
  if (existing) {
    console.log(`[commission] order ${orderId} already processed — skip`)
    return
  }

  const rules = await prisma.commissionRule.findMany({
    where: { tenantId, type: 'SALES', isActive: true },
    orderBy: { minLevel: 'asc' },
  })

  if (rules.length === 0) {
    console.log(`[commission] no active SALES rules for tenant ${tenantId}`)
    return
  }

  const orderAmount = Number(order.total)
  const recipientId = order.createdById

  for (const rule of rules) {
    const commissionAmount =
      rule.valueType === CommissionValueType.PERCENTAGE
        ? (orderAmount * Number(rule.value)) / 100
        : Number(rule.value)

    const wallet = await prisma.wallet.upsert({
      where: { userId: recipientId },
      create: { tenantId, userId: recipientId, balance: 0, holdBalance: 0 },
      update: {},
    })

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = balanceBefore + commissionAmount

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.COMMISSION,
          amount: commissionAmount,
          balanceBefore,
          balanceAfter,
          referenceId: orderId,
          note: `Commission: ${rule.name} — Order ${orderId}`,
        },
      }),
      prisma.commissionLog.create({
        data: {
          tenantId,
          orderId,
          recipientId,
          ruleId: rule.id,
          ruleType: rule.type,
          commissionAmount,
          status: CommissionLogStatus.PAID,
          note: `${rule.name} (${rule.valueType === CommissionValueType.PERCENTAGE ? rule.value + '%' : 'RM' + rule.value})`,
        },
      }),
    ])

    console.log(`[commission] RM${commissionAmount.toFixed(2)} credited to user ${recipientId} for order ${orderId}`)
  }
}

