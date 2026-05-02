import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  AdjustStockDto,
  CreateWarehouseDto,
  ListMovementQueryDto,
  ListStockQueryDto,
  ReleaseStockDto,
  ReserveStockDto,
  StockMovementTypeDto,
  UpdateWarehouseDto,
} from './dto/inventory.dto'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Summary ────────────────────────────────────────────────
  async summary(tenantId: string, ownerId: string): Promise<Record<string, unknown>> {
    const [totalSkus, lowStocks, warehouses] = await Promise.all([
      this.prisma.productVariation.count({
        where: { product: { tenantId, ownerId } },
      }),
      this.prisma.productStock.count({
        where: {
          variation: { product: { tenantId, ownerId } },
          quantity: { lte: 5 },
        },
      }),
      this.prisma.warehouse.count({ where: { tenantId, ownerId } }),
    ])
    return { totalStocks: totalSkus, lowStocks, warehouses }
  }

  // ─── Stocks ─────────────────────────────────────────────────
  async listStocks(
    tenantId: string,
    ownerId: string,
    query: ListStockQueryDto,
  ): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    // Query from ProductVariation so ALL SKUs appear even with 0 stock
    const where: Record<string, unknown> = {
      product: { tenantId, ownerId },
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search } },
              { name: { contains: query.search } },
              { product: { name: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.variationId ? { id: query.variationId } : {}),
    }

    const [variations, total] = await Promise.all([
      this.prisma.productVariation.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          stocks: {
            include: { warehouse: { select: { id: true, name: true } } },
            ...(query.warehouseId ? { where: { warehouseId: query.warehouseId } } : {}),
          },
        },
        orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.productVariation.count({ where }),
    ])

    // Flatten: one row per variation (sum all warehouses if no filter)
    const items = variations.map((v) => {
      const totalQty = v.stocks.reduce((s, r) => s + r.quantity, 0)
      const totalReserved = v.stocks.reduce((s, r) => s + r.reserved, 0)
      const warehouse = v.stocks.length === 1 ? v.stocks[0].warehouse : undefined
      return {
        id: v.id,
        variationId: v.id,
        variation: { id: v.id, sku: v.sku, name: v.name, product: v.product },
        warehouse,
        quantity: totalQty,
        reserved: totalReserved,
        available: totalQty - totalReserved,
        stockRows: v.stocks,
      }
    })

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ─── Adjust Stock ────────────────────────────────────────────
  async adjustStock(
    tenantId: string,
    ownerId: string,
    dto: AdjustStockDto,
  ): Promise<Record<string, unknown>> {
    if (dto.type === StockMovementTypeDto.RESERVED || dto.type === StockMovementTypeDto.RELEASED) {
      throw new BadRequestException('Use reserve/release endpoints for reserved stock changes')
    }
    const warehouseId = await this.resolveWarehouseId(tenantId, ownerId, dto.warehouseId)
    await this.assertVariationOwner(tenantId, ownerId, dto.variationId)

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.upsert({
        where: { variationId_warehouseId: { variationId: dto.variationId, warehouseId } },
        update: {},
        create: { variationId: dto.variationId, warehouseId, quantity: 0, reserved: 0 },
      })

      const nextQty = this.calculateQty(stock.quantity, dto.quantity, dto.type)
      if (nextQty < 0) throw new BadRequestException('Stock cannot be negative')

      const updated = await tx.productStock.update({
        where: { id: stock.id },
        data: { quantity: nextQty },
      })

      await tx.stockMovement.create({
        data: { variationId: dto.variationId, quantity: dto.quantity, type: dto.type, referenceId: dto.referenceId, note: dto.note },
      })

      return updated as unknown as Record<string, unknown>
    })
  }

  // ─── Reserve Stock ───────────────────────────────────────────
  async reserveStock(
    tenantId: string,
    ownerId: string,
    dto: ReserveStockDto,
  ): Promise<Record<string, unknown>> {
    const warehouseId = await this.resolveWarehouseId(tenantId, ownerId, dto.warehouseId)
    await this.assertVariationOwner(tenantId, ownerId, dto.variationId)

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.upsert({
        where: { variationId_warehouseId: { variationId: dto.variationId, warehouseId } },
        update: {},
        create: { variationId: dto.variationId, warehouseId, quantity: 0, reserved: 0 },
      })

      const available = stock.quantity - stock.reserved
      if (dto.quantity > available) throw new BadRequestException('Insufficient available stock to reserve')

      const updated = await tx.productStock.update({
        where: { id: stock.id },
        data: { reserved: stock.reserved + dto.quantity },
      })

      await tx.stockMovement.create({
        data: { variationId: dto.variationId, quantity: dto.quantity, type: StockMovementTypeDto.RESERVED, referenceId: dto.referenceId, note: dto.note },
      })

      return updated as unknown as Record<string, unknown>
    })
  }

  // ─── Release Stock ───────────────────────────────────────────
  async releaseStock(
    tenantId: string,
    ownerId: string,
    dto: ReleaseStockDto,
  ): Promise<Record<string, unknown>> {
    const warehouseId = await this.resolveWarehouseId(tenantId, ownerId, dto.warehouseId)
    await this.assertVariationOwner(tenantId, ownerId, dto.variationId)

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.findUnique({
        where: { variationId_warehouseId: { variationId: dto.variationId, warehouseId } },
      })
      if (!stock) throw new BadRequestException('Stock row does not exist')
      if (dto.quantity > stock.reserved) throw new BadRequestException('Cannot release more than reserved stock')

      const updated = await tx.productStock.update({
        where: { id: stock.id },
        data: { reserved: stock.reserved - dto.quantity },
      })

      await tx.stockMovement.create({
        data: { variationId: dto.variationId, quantity: dto.quantity, type: StockMovementTypeDto.RELEASED, referenceId: dto.referenceId, note: dto.note },
      })

      return updated as unknown as Record<string, unknown>
    })
  }

  // ─── Movement Logs ───────────────────────────────────────────
  async movementLogs(
    tenantId: string,
    ownerId: string,
    query: ListMovementQueryDto,
  ): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      variation: { product: { tenantId, ownerId } },
      ...(query.variationId ? { variationId: query.variationId } : {}),
      ...(query.type ? { type: query.type } : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          variation: {
            select: { id: true, sku: true, name: true, product: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ])

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ─── Warehouses ──────────────────────────────────────────────
  async listWarehouses(tenantId: string, ownerId: string): Promise<Record<string, unknown>[]> {
    return this.prisma.warehouse.findMany({
      where: { tenantId, ownerId },
      include: { _count: { select: { stocks: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }) as unknown as Record<string, unknown>[]
  }

  async createWarehouse(
    tenantId: string,
    ownerId: string,
    dto: CreateWarehouseDto,
  ): Promise<Record<string, unknown>> {
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({ where: { tenantId, ownerId }, data: { isDefault: false } })
    }
    return this.prisma.warehouse.create({
      data: { tenantId, ownerId, name: dto.name, address: dto.address, isDefault: dto.isDefault ?? false },
    }) as unknown as Record<string, unknown>
  }

  async updateWarehouse(
    tenantId: string,
    ownerId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<Record<string, unknown>> {
    const exists = await this.prisma.warehouse.findFirst({ where: { id, tenantId, ownerId } })
    if (!exists) throw new NotFoundException('Warehouse not found')

    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({ where: { tenantId, ownerId }, data: { isDefault: false } })
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: { name: dto.name, address: dto.address, isDefault: dto.isDefault },
    }) as unknown as Record<string, unknown>
  }

  async deleteWarehouse(tenantId: string, ownerId: string, id: string): Promise<void> {
    const exists = await this.prisma.warehouse.findFirst({ where: { id, tenantId, ownerId } })
    if (!exists) throw new NotFoundException('Warehouse not found')
    if (exists.isDefault) throw new BadRequestException('Cannot delete default warehouse')
    await this.prisma.warehouse.delete({ where: { id } })
  }

  // ─── Private Helpers ─────────────────────────────────────────
  private calculateQty(current: number, delta: number, type: StockMovementTypeDto): number {
    if (type === StockMovementTypeDto.IN || type === StockMovementTypeDto.ADJUSTMENT) return current + delta
    if (type === StockMovementTypeDto.OUT) return current - delta
    return current
  }

  private async assertVariationOwner(tenantId: string, ownerId: string, variationId: string): Promise<void> {
    const exists = await this.prisma.productVariation.findFirst({
      where: { id: variationId, product: { tenantId, ownerId } },
      select: { id: true },
    })
    if (!exists) throw new BadRequestException('Variation not found')
  }

  private async resolveWarehouseId(tenantId: string, ownerId: string, warehouseId?: string): Promise<string> {
    if (warehouseId) {
      const exists = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId, ownerId },
        select: { id: true },
      })
      if (!exists) throw new BadRequestException('Warehouse not found')
      return warehouseId
    }

    const def = await this.prisma.warehouse.findFirst({
      where: { tenantId, ownerId, isDefault: true },
      select: { id: true },
    })
    if (def) return def.id

    const created = await this.prisma.warehouse.create({
      data: { tenantId, ownerId, name: 'Gudang Lalai', isDefault: true },
      select: { id: true },
    })
    return created.id
  }
}
