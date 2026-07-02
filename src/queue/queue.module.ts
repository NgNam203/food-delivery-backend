import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueName } from './queue.constants';
import { PaymentQueueService } from './payment-queue/payment-queue.service';
import { PaymentProcessor } from './payment.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),

    BullModule.registerQueue({
      name: QueueName.PAYMENT,
    }),
  ],
  exports: [BullModule, PaymentQueueService],
  providers: [PaymentQueueService],
})
export class QueueModule {}
