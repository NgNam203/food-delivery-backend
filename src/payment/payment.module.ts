import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
@Module({
  imports: [
    PrismaModule,
    OrderModule,
    CacheModule,
    forwardRef(() => QueueModule),
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
