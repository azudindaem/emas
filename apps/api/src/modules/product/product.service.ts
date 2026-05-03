import { BadRequestException, Injectable } from '@nestjs/common'
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

  // ─── Summary ─────────────────────────────────────────────────
  async summary(tenantId: string, ownerId: string): Promise<Record<string, unknown>> {
    const [totalProducts, totalVariations, totalStock, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, ownerId } }),
      this.prisma.productVariation.count({ where: { product: { tenantId, ownerId } } }),
      this.prisma.productStock.aggregate({
        where: { variation: { product: { tenantId, ownerId } } },
        _sum: { quantity: true },
      }),
      this.prisma.productStock.count({
        where: { variation: { product: { tenantId, ownerId } }, quantity: { lte: 5 } },
      }),
    ])
    return {
      totalProducts,
      totalVariations,
      totalStock: totalStock._sum.quantity ?? 0,
      lowStock,
    }
  }

  // ─── List with filters ───────────────────────────────────────
  async list(tenantId: string, ownerId: string, query: ListProductQueryDto): Promise<Record<string, unknown>> {
    const parsedPage = Number(query.page)
    const parsedLimit = Number(query.limit)
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(200, Math.floor(parsedLimit))
      : 20
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ownerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? { OR: [{ sku: { contains: query.search } }, { name: { contains: query.search } }] }
        : {}),
    }

    const orderBy = this.resolveSort(query.sortBy)

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { variations: { include: { stocks: { select: { quantity: true, reserved: true } } } } },
      }),
      this.prisma.product.count({ where }),
    ])

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  // ─── Categories list (distinct) ──────────────────────────────
  async listCategories(tenantId: string, ownerId: string): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { tenantId, ownerId, categoryId: { not: null } },
      select: { categoryId: true },
      distinct: ['categoryId'],
    })
    return rows.map(r => r.categoryId as string).filter(Boolean)
  }

  // ─── Export CSV ──────────────────────────────────────────────
  async exportCsv(tenantId: string, ownerId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { tenantId, ownerId },
      include: { variations: true },
      orderBy: { name: 'asc' },
    })

    const rows: string[] = ['Product SKU,Product Name,Category,Status,Variation SKU,Variation Name,Price,Weight']
    for (const p of products) {
      if (p.variations.length === 0) {
        rows.push([p.sku, this.csv(p.name), this.csv(p.categoryId ?? ''), p.status, '', '', '', ''].join(','))
      } else {
        for (const v of p.variations) {
          rows.push([p.sku, this.csv(p.name), this.csv(p.categoryId ?? ''), p.status, v.sku, this.csv(v.name), v.price, v.weight].join(','))
        }
      }
    }
    return rows.join('\n')
  }

  // ─── Import CSV ──────────────────────────────────────────────
  async importCsv(tenantId: string, ownerId: string, csvText: string): Promise<{ created: number; skipped: number; errors: string[] }> {
    const lines = csvText.replace(/\r/g, '').split('\n').filter(Boolean)
    if (lines.length < 2) throw new BadRequestException('CSV kosong atau format salah')

    const header = lines[0].toLowerCase()
    if (!header.includes('product sku') || !header.includes('variation sku')) {
      throw new BadRequestException('Header CSV tidak betul. Gunakan template export.')
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    // Group by product SKU
    const productMap = new Map<string, { name: string; category: string; status: string; variations: { sku: string; name: string; price: string; weight: string }[] }>()

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i])
      if (cols.length < 4) { errors.push(`Baris ${i + 1}: kolum tidak cukup`); continue }
      const [pSku, pName, category, status, vSku, vName, price, weight] = cols
      if (!pSku) { errors.push(`Baris ${i + 1}: Product SKU kosong`); continue }

      if (!productMap.has(pSku)) {
        productMap.set(pSku, { name: pName, category, status: status || 'ACTIVE', variations: [] })
      }
      if (vSku && vName) {
        productMap.get(pSku)!.variations.push({ sku: vSku, name: vName, price: price || '0', weight: weight || '0' })
      }
    }

    for (const [pSku, data] of productMap) {
      try {
        const existing = await this.prisma.product.findFirst({ where: { sku: pSku, tenantId, ownerId } })
        if (existing) { skipped++; continue }

        await this.prisma.product.create({
          data: {
            tenantId, ownerId,
            sku: pSku,
            name: data.name,
            categoryId: data.category || undefined,
            status: (data.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') || 'ACTIVE',
            variations: data.variations.length ? {
              create: data.variations.map(v => ({
                sku: v.sku, name: v.name,
                price: this.money(parseFloat(v.price) || 0),
                weight: this.weight(parseFloat(v.weight) || 0),
              })),
            } : undefined,
          },
        })
        created++
      } catch (e) {
        errors.push(`SKU ${pSku}: ${e instanceof Error ? e.message : 'Ralat tidak diketahui'}`)
      }
    }

    return { created, skipped, errors }
  }

  // ─── CRUD ────────────────────────────────────────────────────
  async findOne(tenantId: string, ownerId: string, id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.product.findFirst({
      where: { id, tenantId, ownerId },
      include: { variations: true },
    }) as Promise<Record<string, unknown> | null>
  }

  async create(tenantId: string, ownerId: string, dto: CreateProductDto): Promise<Record<string, unknown>> {
    const product = await this.prisma.product.create({
      data: {
        tenantId, ownerId,
        sku: dto.sku, name: dto.name,
        description: dto.description, brandId: dto.brandId, categoryId: dto.categoryId, status: dto.status,
        tags: dto.tags, minOrderQty: dto.minOrderQty, isFeatured: dto.isFeatured, imageUrl: dto.imageUrl,
        variations: dto.variations?.length ? {
          create: dto.variations.map(v => ({
            sku: v.sku, name: v.name,
            price: this.money(v.price), weight: this.weight(v.weight), imageUrl: v.imageUrl,
          })),
        } : undefined,
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
      data: { sku: dto.sku, name: dto.name, description: dto.description, brandId: dto.brandId, categoryId: dto.categoryId, status: dto.status, tags: dto.tags, minOrderQty: dto.minOrderQty, isFeatured: dto.isFeatured, imageUrl: dto.imageUrl },
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
    return this.prisma.productVariation.create({
      data: { productId, sku: dto.sku, name: dto.name, price: this.money(dto.price), weight: this.weight(dto.weight), imageUrl: dto.imageUrl },
    }) as unknown as Record<string, unknown>
  }

  async updateVariation(tenantId: string, ownerId: string, productId: string, variationId: string, dto: UpdateVariationDto): Promise<Record<string, unknown> | null> {
    const variation = await this.prisma.productVariation.findFirst({
      where: { id: variationId, productId, product: { tenantId, ownerId } },
    })
    if (!variation) return null
    return this.prisma.productVariation.update({
      where: { id: variationId },
      data: {
        sku: dto.sku, name: dto.name,
        price: dto.price === undefined ? undefined : this.money(dto.price),
        weight: dto.weight === undefined ? undefined : this.weight(dto.weight),
        imageUrl: dto.imageUrl,
      },
    }) as unknown as Record<string, unknown>
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

  // ─── Helpers ─────────────────────────────────────────────────
  private resolveSort(sortBy?: string): Record<string, unknown>[] {
    switch (sortBy) {
      case 'name_asc': return [{ name: 'asc' }]
      case 'name_desc': return [{ name: 'desc' }]
      case 'created_asc': return [{ createdAt: 'asc' }]
      default: return [{ createdAt: 'desc' }]
    }
  }

  private money(value: number): string { return Number(value).toFixed(2) }
  private weight(value: number): string { return Number(value).toFixed(3) }
  private csv(v: string): string { return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v }

  private parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { result.push(current.trim()); current = '' }
      else { current += ch }
    }
    result.push(current.trim())
    return result
  }
}
