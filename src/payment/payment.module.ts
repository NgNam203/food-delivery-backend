import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [PrismaModule, OrderModule],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
