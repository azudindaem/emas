import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CommissionValueType, CommissionLogStatus, WalletTransactionType } from '@emas/db'
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  CalculateCommissionDto,
  ListCommissionRulesQueryDto,
} from './dto/commission.dto'

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Commission Rules ────────────────────────────────────────────────────

  async listRules(tenantId: string, query: ListCommissionRulesQueryDto): Promise<unknown[]> {
    return this.prisma.commissionRule.findMany({
      where: {
        tenantId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: [{ type: 'asc' }, { minLevel: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async getRule(tenantId: string, id: string): Promise<unknown> {
    const rule = await this.prisma.commissionRule.findFirst({ where: { id, tenantId } })
    if (!rule) throw new NotFoundException('Commission rule not found')
    return rule
  }

  async createRule(tenantId: string, dto: CreateCommissionRuleDto): Promise<unknown> {
    return this.prisma.commissionRule.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        value: dto.value,
        valueType: dto.valueType ?? CommissionValueType.PERCENTAGE,
        minLevel: dto.minLevel,
        maxLevel: dto.maxLevel,
        isActive: true,
      },
    })
  }

  async updateRule(tenantId: string, id: string, dto: UpdateCommissionRuleDto): Promise<unknown> {
    await this.getRule(tenantId, id)
    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.valueType !== undefined && { valueType: dto.valueType }),
        ...(dto.minLevel !== undefined && { minLevel: dto.minLevel }),
        ...(dto.maxLevel !== undefined && { maxLevel: dto.maxLevel }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  async deleteRule(tenantId: string, id: string) {
    await this.getRule(tenantId, id)
    await this.prisma.commissionRule.delete({ where: { id } })
    return { success: true }
  }

  // ─── Commission Calculation ───────────────────────────────────────────────

  async calculateAndDistribute(tenantId: string, dto: CalculateCommissionDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, tenantId },
      select: { id: true, total: true, createdById: true, status: true },
    })
    if (!order) throw new NotFoundException('Order not found')

    // Idempotency: skip if already processed for this order
    const existingLogs = await this.prisma.commissionLog.findMany({
      where: { orderId: dto.orderId, tenantId, status: CommissionLogStatus.PAID },
    })
    if (existingLogs.length > 0) {
      return {
        orderId: dto.orderId,
        distributions: [],
        note: 'Commission already processed for this order',
        skipped: true,
      }
    }

    // Get active SALES commission rules
    const rules = await this.prisma.commissionRule.findMany({
      where: { tenantId, type: 'SALES', isActive: true },
      orderBy: { minLevel: 'asc' },
    })

    if (rules.length === 0) {
      return { orderId: dto.orderId, distributions: [], note: 'No active SALES commission rules found' }
    }

    const orderAmount = Number(order.total)
    const recipientUserId = order.createdById

    if (!recipientUserId) {
      return { orderId: dto.orderId, distributions: [], note: 'Order has no assigned team member' }
    }

    const distributions: Array<{
      userId: string
      ruleId: string
      ruleName: string
      commissionAmount: string
      walletCredited: boolean
    }> = []

    for (const rule of rules) {
      const commissionAmount =
        rule.valueType === CommissionValueType.PERCENTAGE
          ? (orderAmount * Number(rule.value)) / 100
          : Number(rule.value)

      // Ensure wallet exists and credit — all in one transaction
      const wallet = await this.prisma.wallet.upsert({
        where: { userId: recipientUserId },
        create: { tenantId, userId: recipientUserId, balance: 0, holdBalance: 0 },
        update: {},
      })

      const balanceBefore = Number(wallet.balance)
      const balanceAfter = balanceBefore + commissionAmount

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        }),
        this.prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.COMMISSION,
            amount: commissionAmount,
            balanceBefore,
            balanceAfter,
            referenceId: dto.orderId,
            note: `Commission: ${rule.name} — Order ${dto.orderId}`,
          },
        }),
        this.prisma.commissionLog.create({
          data: {
            tenantId,
            orderId: dto.orderId,
            recipientId: recipientUserId,
            ruleId: rule.id,
            ruleType: rule.type,
            commissionAmount,
            status: CommissionLogStatus.PAID,
            note: `${rule.name} (${rule.valueType === CommissionValueType.PERCENTAGE ? rule.value + '%' : 'RM' + rule.value})`,
          },
        }),
      ])

      distributions.push({
        userId: recipientUserId,
        ruleId: rule.id,
        ruleName: rule.name,
        commissionAmount: commissionAmount.toFixed(2),
        walletCredited: true,
      })
    }

    return {
      orderId: dto.orderId,
      orderAmount: orderAmount.toFixed(2),
      distributions,
      note: distributions.length > 0
        ? 'Commission distributed successfully'
        : 'No distributions made',
    }
  }

  // ─── Commission Logs ─────────────────────────────────────────────────────

  async listLogs(tenantId: string, userId?: string, orderId?: string): Promise<unknown[]> {
    return this.prisma.commissionLog.findMany({
      where: {
        tenantId,
        ...(userId ? { recipientId: userId } : {}),
        ...(orderId ? { orderId } : {}),
      },
      include: {
        order: { select: { orderNo: true, total: true } },
        recipient: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }
}

