import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  ConfirmPaymentDto,
  MockPaymentResult,
} from './dto/confirm-payment.dto';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';
import { randomUUID } from 'crypto';
import { PaymentQueueService } from '../queue/payment-queue/payment-queue.service';

class TerminalPaymentTransitionConflict extends Error {}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly dashboardCacheService: DashboardCacheService,
    private readonly paymentQueueService: PaymentQueueService,
  ) {}

  async create(orderId: string, customerId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled order cannot be paid');
    }

    if (order.payment) {
      throw new BadRequestException('Payment already exists');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amount: order.totalAmount,
      },
    });

    await this.paymentQueueService.schedulePaymentTimeout(payment.id);

    return payment;
  }

  async confirm(paymentId: string, customerId: string, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.order.customerId !== customerId) {
      throw new ForbiddenException('Access denied');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payment can be confirmed');
    }

    if (payment.order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled order cannot be paid');
    }

    if (dto.simulate === MockPaymentResult.FAILED) {
      const failedPayment = await this.failPendingPaymentAndCancelOrder(
        payment.id,
        `MOCK_${randomUUID()}`,
      );

      if (!failedPayment) {
        throw new BadRequestException(
          'Only pending payment for a pending order can be failed',
        );
      }

      return failedPayment;
    }

    const updated = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.PAID,
        transactionId: `MOCK_${randomUUID()}`,
        paidAt: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Only pending payment can be confirmed');
    }

    const updatedPayment = await this.prisma.payment.findUniqueOrThrow({
      where: {
        id: payment.id,
      },
    });

    await this.dashboardCacheService.invalidateByRestaurantId(
      payment.order.restaurantId,
    );

    return updatedPayment;
  }

  async findMyPayments(customerId: string) {
    return this.prisma.payment.findMany({
      where: {
        order: {
          customerId,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async failPendingPaymentAndCancelOrder(
    paymentId: string,
    transactionId: string,
  ) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: {
            id: paymentId,
          },
          include: {
            order: {
              include: {
                items: true,
              },
            },
          },
        });

        if (
          !payment ||
          payment.status !== PaymentStatus.PENDING ||
          payment.order.status !== OrderStatus.PENDING
        ) {
          return null;
        }

        const cancelledOrder = await tx.order.updateMany({
          where: {
            id: payment.order.id,
            status: OrderStatus.PENDING,
          },
          data: {
            status: OrderStatus.CANCELLED,
          },
        });

        if (cancelledOrder.count === 0) {
          return null;
        }

        const failedPayment = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.FAILED,
            transactionId,
            paidAt: null,
          },
        });

        if (failedPayment.count === 0) {
          throw new TerminalPaymentTransitionConflict();
        }

        for (const item of payment.order.items) {
          await tx.menuItem.update({
            where: {
              id: item.menuItemId,
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        const updatedPayment = await tx.payment.findUniqueOrThrow({
          where: {
            id: payment.id,
          },
        });

        return {
          payment: updatedPayment,
          restaurantId: payment.order.restaurantId,
        };
      });

      if (!result) {
        return null;
      }

      await this.dashboardCacheService.invalidateByRestaurantId(
        result.restaurantId,
      );

      return result.payment;
    } catch (error) {
      if (error instanceof TerminalPaymentTransitionConflict) {
        return null;
      }

      throw error;
    }
  }

  async handlePaymentTimeout(paymentId: string): Promise<void> {
    await this.failPendingPaymentAndCancelOrder(
      paymentId,
      `TIMEOUT_${randomUUID()}`,
    );
  }
}
