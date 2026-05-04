import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertPaymentGatewayDto } from './dto/payment-settings.dto'
import { Prisma } from '@emas/db'

const ALLOWED_GATEWAYS = ['GENERAL', 'CHIP', 'STRIPE', 'AHAPAY', 'BILLPLZ', 'BAYARCASH', 'TOYYIBPAY']

const CHIP_BASE_URLS: Record<string, string> = {
  production: 'https://gate.chip-in.asia',
  sandbox: 'https://gate.chip-in.asia', // CHIP uses same URL, sandbox uses test keys
}

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

  async fetchChipPublicKey(secretKey: string, environment: string): Promise<string> {
    if (!secretKey) throw new BadRequestException('secret_key is required to fetch public key')
    const baseUrl = CHIP_BASE_URLS[environment] ?? CHIP_BASE_URLS.production
    const res = await fetch(`${baseUrl}/api/v1/public_key/`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new BadRequestException(`CHIP API error ${res.status}: ${body}`)
    }
    const data = await res.json() as { public_key?: string } | string
    // CHIP may return { public_key: '...' } or raw PEM string
    let key: string
    if (typeof data === 'string') key = data
    else if (typeof data === 'object' && data !== null && 'public_key' in data) key = String(data.public_key)
    else throw new BadRequestException('Unexpected response from CHIP API')
    // Normalize literal \n escape sequences to real newlines
    return key.replace(/\\n/g, '\n')
  }
}
