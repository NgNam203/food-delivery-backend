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

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly dashboardCacheService: DashboardCacheService,
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

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amount: order.totalAmount,
      },
    });
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

    const isSuccess = dto.simulate === MockPaymentResult.SUCCESS;

    const updatedPayment = await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
        transactionId: `MOCK_${randomUUID()}`,
        paidAt: isSuccess ? new Date() : null,
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
}
