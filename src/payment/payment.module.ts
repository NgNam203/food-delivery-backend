import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
import { PaymentProcessor } from '../queue/payment.processor';
@Module({
  imports: [PrismaModule, OrderModule, CacheModule, QueueModule],
  providers: [PaymentService, PaymentProcessor],
  controllers: [PaymentController],
})
export class PaymentModule {}
