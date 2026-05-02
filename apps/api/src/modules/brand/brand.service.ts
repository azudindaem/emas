import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBrandDto, UpdateBrandDto, UpdateBrandingDto } from './dto/brand.dto'

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Brands ───────────────────────────────────────────────────────────────

  async listBrands(tenantId: string): Promise<unknown[]> {
    return this.prisma.brand.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createBrand(tenantId: string, dto: CreateBrandDto): Promise<unknown> {
    const existing = await this.prisma.brand.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    })
    if (existing) throw new ConflictException('Brand name already exists')

    return this.prisma.brand.create({
      data: {
        tenantId,
        name: dto.name,
        logoUrl: dto.logoUrl,
        settings: dto.settings ? (dto.settings as object) : undefined,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async getBrand(tenantId: string, id: string): Promise<unknown> {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } })
    if (!brand) throw new NotFoundException('Brand not found')
    return brand
  }

  async updateBrand(tenantId: string, id: string, dto: UpdateBrandDto): Promise<unknown> {
    await this.getBrand(tenantId, id)
    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        settings: dto.settings ? (dto.settings as object) : undefined,
        isActive: dto.isActive,
      },
    })
  }

  async deleteBrand(tenantId: string, id: string) {
    await this.getBrand(tenantId, id)
    await this.prisma.brand.delete({ where: { id } })
    return { success: true }
  }

  // ─── Tenant Branding (white-label) ────────────────────────────────────────

  async getBranding(tenantId: string): Promise<unknown> {
    const branding = await this.prisma.tenantBranding.findUnique({ where: { tenantId } })
    return branding ?? { tenantId, companyName: '', primaryColor: '#000000' }
  }

  async upsertBranding(tenantId: string, dto: UpdateBrandingDto): Promise<unknown> {
    return this.prisma.tenantBranding.upsert({
      where: { tenantId },
      create: {
        tenantId,
        companyName: dto.companyName ?? '',
        primaryColor: dto.primaryColor ?? '#000000',
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        emailHeader: dto.emailHeader,
        customCss: dto.customCss,
      },
      update: {
        companyName: dto.companyName,
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        emailHeader: dto.emailHeader,
        customCss: dto.customCss,
      },
    })
  }
}
