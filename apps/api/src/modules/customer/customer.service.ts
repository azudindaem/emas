import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CustomerOrdersQueryDto, ListCustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto'

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListCustomerQueryDto): Promise<Record<string, unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { phone: { contains: query.search } },
              { email: { contains: query.search } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ])

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(tenantId: string, id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.customer.findFirst({ where: { id, tenantId } }) as Promise<Record<string, unknown> | null>
  }

  async listOrders(
    tenantId: string,
    ownerId: string,
    customerId: string,
    query: CustomerOrdersQueryDto,
  ): Promise<Record<string, unknown>> {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } })
    if (!customer) {
      return { items: [], meta: { total: 0, limit: query.limit ?? 20 } }
    }

    const limit = query.limit ?? 20

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId, ownerId, customerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { items: true },
      }),
      this.prisma.order.count({ where: { tenantId, ownerId, customerId } }),
    ])

    return { items, meta: { total, limit } }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<Record<string, unknown> | null> {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } })
    if (!customer) return null

    const data: Record<string, unknown> = {}

    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.phone !== undefined) data.phone = dto.phone.trim()
    if (dto.email !== undefined) {
      const trimmed = dto.email.trim()
      data.email = trimmed || null
    }
    if (dto.address !== undefined) data.address = dto.address

    if (Object.keys(data).length === 0) {
      return customer as unknown as Record<string, unknown>
    }

    return this.prisma.customer.update({
      where: { id },
      data,
    }) as unknown as Record<string, unknown>
  }
}
