import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto, RegisterDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, memberships: { some: { tenantId } } },
    })

    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    if (hash !== user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const tokens = this.generateTokens(user.id, tenantId)
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    }
  }

  async register(dto: RegisterDto, tenantId: string) {
    const exists = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    })
    if (exists) throw new ConflictException('Email already registered')

    const passwordHash = crypto.createHash('sha256').update(dto.password).digest('hex')

    const membershipCount = await this.prisma.membership.count({ where: { tenantId } })

    const ownerRole =
      (await this.prisma.role.findFirst({
        where: { tenantId, name: 'Owner' },
      })) ??
      (await this.prisma.role.create({
        data: {
          tenantId,
          name: 'Owner',
          level: 100,
          permissions: ['*'],
          isDefault: false,
        },
      }))

    const defaultRole =
      (await this.prisma.role.findFirst({
        where: { tenantId, isDefault: true },
      })) ??
      (await this.prisma.role.create({
        data: {
          tenantId,
          name: 'Member',
          level: 1,
          permissions: ['order.read', 'product.read'],
          isDefault: true,
        },
      }))

    const assignedRole = membershipCount === 0 ? ownerRole : defaultRole

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
    })

    await this.prisma.membership.create({
      data: {
        tenantId,
        userId: user.id,
        roleId: assignedRole.id,
        level: assignedRole.level,
      },
    })

    const tokens = this.generateTokens(user.id, tenantId)
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    }
  }

  private generateTokens(userId: string, tenantId: string) {
    const payload = { sub: userId, tenantId }
    const accessToken = this.jwt.sign(payload)
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.config.get('JWT_SECRET') + '-refresh',
    })
    return { accessToken, refreshToken }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; tenantId: string }>(refreshToken, {
        secret: this.config.get('JWT_SECRET') + '-refresh',
      })
      return this.generateTokens(payload.sub, payload.tenantId)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}
