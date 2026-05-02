import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  AdjustStockDto,
  ListStockQueryDto,
  ReleaseStockDto,
  ReserveStockDto,
  StockMovementTypeDto,
} from './dto/inventory.dto'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listStocks(tenantId: string, ownerId: string, query: ListStockQueryDto): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.productStock.findMany({
      where: {
        ...(query.variationId ? { variationId: query.variationId } : {}),
        ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
        variation: { product: { tenantId } },
      },
      include: {
        warehouse: true,
        variation: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ warehouse: { name: 'asc' } }],
    })

    return rows as unknown as Record<string, unknown>[]
  }

  async adjustStock(tenantId: string, ownerId: string, dto: AdjustStockDto): Promise<Record<string, unknown>> {
    if (dto.type === StockMovementTypeDto.RESERVED || dto.type === StockMovementTypeDto.RELEASED) {
      throw new BadRequestException('Use reserve/release endpoints for reserved stock changes')
    }

    const warehouseId = await this.resolveWarehouseId(tenantId, ownerId, dto.warehouseId)
    await this.assertVariationTenant(tenantId, ownerId, dto.variationId)

    const result = await this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.upsert({
        where: {
          variationId_warehouseId: {
            variationId: dto.variationId,
            warehouseId,
          },
        },
        update: {},
        create: {
          variationId: dto.variationId,
          warehouseId,
          quantity: 0,
          reserved: 0,
        },
      })

      const nextQty = this.calculateQty(stock.quantity, dto.quantity, dto.type)
      if (nextQty < 0) {
        throw new BadRequestException('Stock cannot be negative')
      }

      const updatedStock = await tx.productStock.update({
        where: { id: stock.id },
        data: { quantity: nextQty },
      })

      await tx.stockMovement.create({
        data: {
          variationId: dto.variationId,
          quantity: dto.quantity,
          type: dto.type,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      })

      return updatedStock
    })

    return result as unknown as Record<string, unknown>
  }

  async reserveStock(tenantId: string, ownerId: string, dto: ReserveStockDto): Promise<Record<string, unknown>> {
    const warehouseId = await this.resolveWarehouseId(tenantId, ownerId, dto.warehouseId)
    await this.assertVariationTenant(tenantId, ownerId, dto.variationId)

    const result = await this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.upsert({
        where: {
          variationId_warehouseId: {
            variationId: dto.variationId,
            warehouseId,
          },
        },
        update: {},
        create: {
          variationId: dto.variationId,
          warehouseId,
          quantity: 0,
          reserved: 0,
        },
      })

      const available = stock.quantity - stock.reserved
      if (dto.quantity > available) {
        throw new BadRequestException('Insufficient available stock to reserve')
      }

      const updatedStock = await tx.productStock.update({
        where: { id: stock.id },
        data: { reserved: stock.reserved + dto.quantity },
      })

      await tx.stockMovement.create({
        data: {
          variationId: dto.variationId,
          quantity: dto.quantity,
          type: StockMovementTypeDto.RESERVED,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      })

      return updatedStock
    })

    return result as unknown as Record<string, unknown>
  }

  async releaseStock(tenantId: string, ownerId: string, dto: ReleaseStockDto): Promise<Record<string, unknown>> {
    const warehouseId = await this.resolveWarehouseId(tenantId, ownerId, dto.warehouseId)
    await this.assertVariationTenant(tenantId, ownerId, dto.variationId)

    const result = await this.prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.findUnique({
        where: {
          variationId_warehouseId: {
            variationId: dto.variationId,
            warehouseId,
          },
        },
      })

      if (!stock) {
        throw new BadRequestException('Stock row does not exist')
      }

      if (dto.quantity > stock.reserved) {
        throw new BadRequestException('Cannot release more than reserved stock')
      }

      const updatedStock = await tx.productStock.update({
        where: { id: stock.id },
        data: { reserved: stock.reserved - dto.quantity },
      })

      await tx.stockMovement.create({
        data: {
          variationId: dto.variationId,
          quantity: dto.quantity,
          type: StockMovementTypeDto.RELEASED,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      })

      return updatedStock
    })

    return result as unknown as Record<string, unknown>
  }

  async movementLogs(tenantId: string, ownerId: string, variationId?: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.stockMovement.findMany({
      where: {
        ...(variationId ? { variationId } : {}),
        variation: { product: { tenantId } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return rows as unknown as Record<string, unknown>[]
  }

  private calculateQty(current: number, movementQty: number, type: StockMovementTypeDto): number {
    if (type === StockMovementTypeDto.IN || type === StockMovementTypeDto.ADJUSTMENT) {
      return current + movementQty
    }
    if (type === StockMovementTypeDto.OUT) {
      return current - movementQty
    }
    return current
  }

  private async assertVariationTenant(tenantId: string, ownerId: string, variationId: string): Promise<void> {
    const exists = await this.prisma.productVariation.findFirst({
      where: { id: variationId, product: { tenantId, ownerId } },
      select: { id: true },
    })
    if (!exists) {
      throw new BadRequestException('Variation not found for this tenant')
    }
  }

  private async resolveWarehouseId(tenantId: string, ownerId: string, warehouseId?: string): Promise<string> {
    if (warehouseId) {
      const exists = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId, ownerId },
        select: { id: true },
      })
      if (!exists) throw new BadRequestException('Warehouse not found for this tenant')
      return warehouseId
    }

    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, ownerId, isDefault: true },
      select: { id: true },
    })

    if (defaultWarehouse) return defaultWarehouse.id

    const created = await this.prisma.warehouse.create({
      data: {
        tenantId,
        ownerId,
        name: 'Default Warehouse',
        isDefault: true,
      },
      select: { id: true },
    })

    return created.id
  }
}
