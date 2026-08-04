import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';
import { PaymentQueueService } from '../queue/payment-queue/payment-queue.service';
import { MockPaymentResult } from './dto/confirm-payment.dto';

describe('PaymentService', () => {
  let service: PaymentService;

  const prismaMock = {
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const orderServiceMock = {};

  const dashboardCacheServiceMock = {
    invalidateByRestaurantId: jest.fn(),
  };

  const paymentQueueServiceMock = {
    schedulePaymentTimeout: jest.fn(),
  };

  const txMock = {
    payment: {
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: OrderService,
          useValue: orderServiceMock,
        },
        {
          provide: DashboardCacheService,
          useValue: dashboardCacheServiceMock,
        },
        {
          provide: PaymentQueueService,
          useValue: paymentQueueServiceMock,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);

    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create payment successfully', async () => {
    const orderId = 'order-id';
    const customerId = 'customer-id';

    const dto = {
      method: 'CASH',
    };

    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      totalAmount: 100,
      status: OrderStatus.PENDING,
      payment: null,
    });

    const payment = {
      id: 'payment-id',
      orderId,
      method: 'CASH',
      amount: 100,
      status: PaymentStatus.PENDING,
    };

    prismaMock.payment.create.mockResolvedValue(payment);

    paymentQueueServiceMock.schedulePaymentTimeout.mockResolvedValue(undefined);

    const result = await service.create(orderId, customerId, dto);

    expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
      where: {
        id: orderId,
      },
      include: {
        payment: true,
      },
    });

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        orderId,
        method: dto.method,
        amount: 100,
      },
    });

    expect(paymentQueueServiceMock.schedulePaymentTimeout).toHaveBeenCalledWith(
      'payment-id',
    );

    expect(result).toEqual(payment);
  });

  it('should throw when order does not exist', async () => {
    const orderId = 'order-id';
    const customerId = 'customer-id';

    const dto = {
      method: 'CASH',
    };

    prismaMock.order.findUnique.mockResolvedValue(null);

    await expect(service.create(orderId, customerId, dto)).rejects.toThrow(
      'Order not found',
    );

    expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
      where: {
        id: orderId,
      },
      include: {
        payment: true,
      },
    });

    expect(prismaMock.payment.create).not.toHaveBeenCalled();

    expect(
      paymentQueueServiceMock.schedulePaymentTimeout,
    ).not.toHaveBeenCalled();
  });

  it('should throw when customer is not allowed to pay this order', async () => {
    const orderId = 'order-id';

    const dto = {
      method: 'CASH',
    };

    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId: 'another-customer',
      totalAmount: 100,
      status: OrderStatus.PENDING,
      payment: null,
    });

    await expect(service.create(orderId, 'customer-id', dto)).rejects.toThrow(
      'Access denied',
    );

    expect(prismaMock.payment.create).not.toHaveBeenCalled();

    expect(
      paymentQueueServiceMock.schedulePaymentTimeout,
    ).not.toHaveBeenCalled();
  });

  it('should throw when order is cancelled', async () => {
    const orderId = 'order-id';
    const customerId = 'customer-id';

    const dto = {
      method: 'CASH',
    };

    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      totalAmount: 100,
      status: OrderStatus.CANCELLED,
      payment: null,
    });

    await expect(service.create(orderId, customerId, dto)).rejects.toThrow(
      'Cancelled order cannot be paid',
    );

    expect(prismaMock.payment.create).not.toHaveBeenCalled();

    expect(
      paymentQueueServiceMock.schedulePaymentTimeout,
    ).not.toHaveBeenCalled();
  });

  it('should throw when payment already exists', async () => {
    const orderId = 'order-id';
    const customerId = 'customer-id';

    const dto = {
      method: 'CASH',
    };

    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      totalAmount: 100,
      status: OrderStatus.PENDING,
      payment: {
        id: 'payment-id',
      },
    });

    await expect(service.create(orderId, customerId, dto)).rejects.toThrow(
      'Payment already exists',
    );

    expect(prismaMock.payment.create).not.toHaveBeenCalled();

    expect(
      paymentQueueServiceMock.schedulePaymentTimeout,
    ).not.toHaveBeenCalled();
  });

  it('should confirm payment successfully', async () => {
    const paymentId = 'payment-id';
    const customerId = 'customer-id';

    const dto = {
      simulate: MockPaymentResult.SUCCESS,
    };

    prismaMock.payment.findUnique.mockResolvedValue({
      id: paymentId,
      status: PaymentStatus.PENDING,
      order: {
        id: 'order-id',
        customerId,
        restaurantId: 'restaurant-id',
      },
    });

    const updatedPayment = {
      id: paymentId,
      status: PaymentStatus.PAID,
      transactionId: 'MOCK_transaction-id',
      paidAt: new Date(),
    };

    prismaMock.payment.update.mockResolvedValue(updatedPayment);

    dashboardCacheServiceMock.invalidateByRestaurantId.mockResolvedValue(
      undefined,
    );

    const result = await service.confirm(paymentId, customerId, dto);

    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: {
        id: paymentId,
      },
      include: {
        order: true,
      },
    });

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.PAID,
        transactionId: expect.stringMatching(/^MOCK_/),
        paidAt: expect.any(Date),
      },
    });

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).toHaveBeenCalledWith('restaurant-id');

    expect(result).toEqual(updatedPayment);
  });

  it('should throw when payment does not exist', async () => {
    const paymentId = 'payment-id';
    const customerId = 'customer-id';

    const dto = {
      simulate: MockPaymentResult.SUCCESS,
    };

    prismaMock.payment.findUnique.mockResolvedValue(null);

    await expect(service.confirm(paymentId, customerId, dto)).rejects.toThrow(
      'Payment not found',
    );

    expect(prismaMock.payment.update).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should throw when customer is not allowed to confirm payment', async () => {
    const paymentId = 'payment-id';

    const dto = {
      simulate: MockPaymentResult.SUCCESS,
    };

    prismaMock.payment.findUnique.mockResolvedValue({
      id: paymentId,
      status: PaymentStatus.PENDING,
      order: {
        customerId: 'another-customer',
        restaurantId: 'restaurant-id',
      },
    });

    await expect(
      service.confirm(paymentId, 'customer-id', dto),
    ).rejects.toThrow('Access denied');

    expect(prismaMock.payment.update).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should throw when payment is not pending', async () => {
    const paymentId = 'payment-id';
    const customerId = 'customer-id';

    const dto = {
      simulate: MockPaymentResult.SUCCESS,
    };

    prismaMock.payment.findUnique.mockResolvedValue({
      id: paymentId,
      status: PaymentStatus.PAID,
      order: {
        customerId,
        restaurantId: 'restaurant-id',
      },
    });

    await expect(service.confirm(paymentId, customerId, dto)).rejects.toThrow(
      'Only pending payment can be confirmed',
    );

    expect(prismaMock.payment.update).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should handle payment timeout successfully', async () => {
    const paymentId = 'payment-id';

    prismaMock.payment.findUnique.mockResolvedValue({
      id: paymentId,
      status: PaymentStatus.PENDING,
      order: {
        id: 'order-id',
        status: OrderStatus.PENDING,
        restaurantId: 'restaurant-id',
      },
    });

    txMock.payment.update.mockResolvedValue({});

    txMock.order.update.mockResolvedValue({});

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return callback(txMock);
    });

    dashboardCacheServiceMock.invalidateByRestaurantId.mockResolvedValue(
      undefined,
    );

    await service.handlePaymentTimeout(paymentId);

    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: {
        id: paymentId,
      },
      include: {
        order: true,
      },
    });

    expect(txMock.payment.update).toHaveBeenCalledWith({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.FAILED,
        transactionId: expect.stringMatching(/^TIMEOUT_/),
        paidAt: null,
      },
    });

    expect(txMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-id',
      },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).toHaveBeenCalledWith('restaurant-id');
  });

  it('should return when payment does not exist', async () => {
    const paymentId = 'payment-id';

    prismaMock.payment.findUnique.mockResolvedValue(null);

    const result = await service.handlePaymentTimeout(paymentId);

    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: {
        id: paymentId,
      },
      include: {
        order: true,
      },
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();

    expect(result).toBeUndefined();
  });

  it('should return when payment is not pending', async () => {
    const paymentId = 'payment-id';

    prismaMock.payment.findUnique.mockResolvedValue({
      id: paymentId,
      status: PaymentStatus.PAID,
      order: {
        id: 'order-id',
        status: OrderStatus.PENDING,
        restaurantId: 'restaurant-id',
      },
    });

    const result = await service.handlePaymentTimeout(paymentId);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();

    expect(result).toBeUndefined();
  });
});
