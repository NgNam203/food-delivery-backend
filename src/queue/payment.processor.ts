import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PaymentService } from '../payment/payment.service';
import { QueueName } from './queue.constants';

type PaymentTimeoutJob = {
  paymentId: string;
};

@Injectable()
@Processor(QueueName.PAYMENT)
export class PaymentProcessor extends WorkerHost {
  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async process(job: Job<PaymentTimeoutJob>): Promise<void> {
    if (job.name === 'payment-timeout') {
      await this.paymentService.handlePaymentTimeout(job.data.paymentId);
    }
  }
}
