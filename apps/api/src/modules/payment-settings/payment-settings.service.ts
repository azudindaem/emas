import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertPaymentGatewayDto } from './dto/payment-settings.dto'
import { Prisma } from '@emas/db'

const ALLOWED_GATEWAYS = ['GENERAL', 'CHIP', 'STRIPE', 'AHAPAY', 'BILLPLZ', 'BAYARCASH', 'TOYYIBPAY']

@Injectable()
export class PaymentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(tenantId: string) {
    const records = await this.prisma.paymentGatewayConfig.findMany({
      where: { tenantId },
    })
    // Return all gateways, filling missing ones with defaults
    return ALLOWED_GATEWAYS.map((gateway) => {
      const record = records.find((r) => r.gateway === gateway)
      return {
        gateway,
        isEnabled: record?.isEnabled ?? false,
        config: (record?.config as Record<string, unknown>) ?? {},
      }
    })
  }

  async getOne(tenantId: string, gateway: string) {
    const g = gateway.toUpperCase()
    if (!ALLOWED_GATEWAYS.includes(g)) throw new NotFoundException('Unknown gateway')
    const record = await this.prisma.paymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: g } },
    })
    return {
      gateway: g,
      isEnabled: record?.isEnabled ?? false,
      config: (record?.config as Record<string, unknown>) ?? {},
    }
  }

  async upsert(tenantId: string, gateway: string, dto: UpsertPaymentGatewayDto): Promise<void> {
    const g = gateway.toUpperCase()
    if (!ALLOWED_GATEWAYS.includes(g)) throw new NotFoundException('Unknown gateway')
    const now = new Date()
    await this.prisma.paymentGatewayConfig.upsert({
      where: { tenantId_gateway: { tenantId, gateway: g } },
      create: {
        id: crypto.randomUUID(),
        tenantId,
        gateway: g,
        isEnabled: dto.isEnabled,
        config: dto.config as Prisma.InputJsonValue,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        isEnabled: dto.isEnabled,
        config: dto.config as Prisma.InputJsonValue,
        updatedAt: now,
      },
    })
  }
}
