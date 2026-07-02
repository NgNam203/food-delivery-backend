import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueName } from '../queue.constants';

@Injectable()
export class PaymentQueueService {
  constructor(
    @InjectQueue(QueueName.PAYMENT)
    private readonly paymentQueue: Queue,
  ) {}

  async schedulePaymentTimeout(paymentId: string): Promise<void> {
    await this.paymentQueue.add(
      'payment-timeout',
      {
        paymentId,
      },
      {
        delay: 30 * 60 * 1000,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
