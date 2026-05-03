import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantModule } from './modules/tenant/tenant.module'
import { UserModule } from './modules/user/user.module'
import { OrderModule } from './modules/order/order.module'
import { ProductModule } from './modules/product/product.module'
import { InvoiceModule } from './modules/invoice/invoice.module'
import { ShippingModule } from './modules/shipping/shipping.module'
import { CommissionModule } from './modules/commission/commission.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { NotificationModule } from './modules/notification/notification.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { CouponModule } from './modules/coupon/coupon.module'
import { BrandModule } from './modules/brand/brand.module'
import { RoleModule } from './modules/role/role.module'
import { CustomerModule } from './modules/customer/customer.module'
import { TenantMiddleware } from './common/middleware/tenant.middleware'
import { TenantResolver } from '@emas/tenancy'
import { envSchema } from './config/env.schema'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    PrismaModule,
    AuthModule,
    TenantModule,
    UserModule,
    OrderModule,
    ProductModule,
    InvoiceModule,
    ShippingModule,
    CommissionModule,
    WalletModule,
    NotificationModule,
    InventoryModule,
    CouponModule,
    BrandModule,
    RoleModule,
    CustomerModule,
  ],
  providers: [TenantResolver],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*')
  }
}
