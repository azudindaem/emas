import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateProductDto,
  CreateVariationDto,
  ListProductQueryDto,
  UpdateProductDto,
  UpdateVariationDto,
} from './dto/product.dto'

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, ownerId: string, query: ListProductQueryDto): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ownerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ sku: { contains: query.search } }, { name: { contains: query.search } }] }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { variations: true },
      }),
      this.prisma.product.count({ where }),
    ])

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(tenantId: string, ownerId: string, id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.product.findFirst({
      where: { id, tenantId, ownerId },
      include: { variations: true },
    }) as Promise<Record<string, unknown> | null>
  }

  async create(tenantId: string, ownerId: string, dto: CreateProductDto): Promise<Record<string, unknown>> {
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        ownerId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        status: dto.status,
        variations: dto.variations?.length
          ? {
              create: dto.variations.map((v) => ({
                sku: v.sku,
                name: v.name,
                price: this.money(v.price),
                weight: this.weight(v.weight),
                imageUrl: v.imageUrl,
              })),
            }
          : undefined,
      },
      include: { variations: true },
    })
    return product as unknown as Record<string, unknown>
  }

  async update(tenantId: string, ownerId: string, id: string, dto: UpdateProductDto): Promise<Record<string, unknown> | null> {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId, ownerId } })
    if (!existing) return null

    const updated = await this.prisma.product.update({
      where: { id },
      data: { sku: dto.sku, name: dto.name, description: dto.description, brandId: dto.brandId, categoryId: dto.categoryId, status: dto.status },
      include: { variations: true },
    })
    return updated as unknown as Record<string, unknown>
  }

  async delete(tenantId: string, ownerId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId, ownerId } })
    if (!existing) return false
    await this.prisma.product.delete({ where: { id } })
    return true
  }

  async createVariation(tenantId: string, ownerId: string, productId: string, dto: CreateVariationDto): Promise<Record<string, unknown> | null> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId, ownerId } })
    if (!product) return null
    const variation = await this.prisma.productVariation.create({
      data: { productId, sku: dto.sku, name: dto.name, price: this.money(dto.price), weight: this.weight(dto.weight), imageUrl: dto.imageUrl },
    })
    return variation as unknown as Record<string, unknown>
  }

  async updateVariation(tenantId: string, ownerId: string, productId: string, variationId: string, dto: UpdateVariationDto): Promise<Record<string, unknown> | null> {
    const variation = await this.prisma.productVariation.findFirst({
      where: { id: variationId, productId, product: { tenantId, ownerId } },
    })
    if (!variation) return null
    const updated = await this.prisma.productVariation.update({
      where: { id: variationId },
      data: {
        sku: dto.sku,
        name: dto.name,
        price: dto.price === undefined ? undefined : this.money(dto.price),
        weight: dto.weight === undefined ? undefined : this.weight(dto.weight),
        imageUrl: dto.imageUrl,
      },
    })
    return updated as unknown as Record<string, unknown>
  }

  async deleteVariation(tenantId: string, ownerId: string, productId: string, variationId: string): Promise<boolean> {
    const variation = await this.prisma.productVariation.findFirst({
      where: { id: variationId, productId, product: { tenantId, ownerId } },
      select: { id: true },
    })
    if (!variation) return false
    await this.prisma.productVariation.delete({ where: { id: variationId } })
    return true
  }

  private money(value: number): string { return Number(value).toFixed(2) }
  private weight(value: number): string { return Number(value).toFixed(3) }
}
