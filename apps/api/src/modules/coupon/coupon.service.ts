import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto'

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<unknown[]> {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(tenantId: string, dto: CreateCouponDto): Promise<unknown> {
    const existing = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    })
    if (existing) throw new BadRequestException('Coupon code already exists')

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        type: dto.type ?? 'PERCENTAGE',
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async get(tenantId: string, id: string): Promise<unknown> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
      include: { usages: true },
    })
    if (!coupon) throw new NotFoundException('Coupon not found')
    return coupon
  }

  async update(tenantId: string, id: string, dto: UpdateCouponDto): Promise<unknown> {
    await this.get(tenantId, id)
    return this.prisma.coupon.update({
      where: { id },
      data: {
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive,
      },
    })
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id)
    await this.prisma.coupon.delete({ where: { id } })
    return { success: true }
  }

  async validate(tenantId: string, dto: ValidateCouponDto): Promise<unknown> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { tenantId, code: dto.code.toUpperCase(), isActive: true },
    })
    if (!coupon) throw new NotFoundException('Coupon not found or inactive')

    const now = new Date()
    if (coupon.startsAt && coupon.startsAt > now)
      throw new BadRequestException('Coupon not yet active')
    if (coupon.expiresAt && coupon.expiresAt < now)
      throw new BadRequestException('Coupon has expired')
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      throw new BadRequestException('Coupon usage limit reached')

    const orderAmount = dto.orderAmount ?? 0
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount))
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount}`)

    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = (orderAmount * Number(coupon.value)) / 100
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount))
    } else {
      discount = Number(coupon.value)
    }

    return { valid: true, coupon, discount }
  }
}
