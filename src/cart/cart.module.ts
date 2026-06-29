import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OrderModule } from '../order/order.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [OrderModule, PricingModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
