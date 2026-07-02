import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CouponModule } from './coupon/coupon.module';
import { PricingModule } from './pricing/pricing.module';
import { PaymentModule } from './payment/payment.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    RestaurantModule,
    MenuItemModule,
    OrderModule,
    CartModule,
    DashboardModule,
    CouponModule,
    PricingModule,
    PaymentModule,
    RedisModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
