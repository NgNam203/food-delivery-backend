import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
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
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
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
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      updateMany: jest.fn(),
    },
    menuItem: {
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
    prismaMock.$transaction.mockImplementation(async (callback) => {
      const result = await callback(txMock);
      expect(
        dashboardCacheServiceMock.invalidateByRestaurantId,
      ).not.toHaveBeenCalled();
      return result;
    });
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

    txMock.payment.findUnique.mockResolvedValue({
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

    txMock.payment.updateMany.mockResolvedValue({ count: 1 });
    txMock.payment.findUniqueOrThrow.mockResolvedValue(updatedPayment);

    dashboardCacheServiceMock.invalidateByRestaurantId.mockResolvedValue(
      undefined,
    );

    const result = await service.confirm(paymentId, customerId, dto);

    expect(txMock.payment.findUnique).toHaveBeenCalledWith({
      where: {
        id: paymentId,
      },
      include: {
        order: true,
      },
    });

    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
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

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(txMock.order.updateMany).not.toHaveBeenCalled();
    expect(txMock.menuItem.update).not.toHaveBeenCalled();
    expect(result).toEqual(updatedPayment);
  });

  it('should throw when payment does not exist', async () => {
    const paymentId = 'payment-id';
    const customerId = 'customer-id';

    const dto = {
      simulate: MockPaymentResult.SUCCESS,
    };

    txMock.payment.findUnique.mockResolvedValue(null);

    await expect(service.confirm(paymentId, customerId, dto)).rejects.toThrow(
      'Payment not found',
    );

    expect(txMock.payment.updateMany).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should throw when customer is not allowed to confirm payment', async () => {
    const paymentId = 'payment-id';

    const dto = {
      simulate: MockPaymentResult.SUCCESS,
    };

    txMock.payment.findUnique.mockResolvedValue({
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

    expect(txMock.payment.updateMany).not.toHaveBeenCalled();

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

    txMock.payment.findUnique.mockResolvedValue({
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

    expect(txMock.payment.updateMany).not.toHaveBeenCalled();

    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  const pendingPaymentWithItems = {
    id: 'payment-id',
    status: PaymentStatus.PENDING,
    order: {
      id: 'order-id',
      status: OrderStatus.PENDING,
      restaurantId: 'restaurant-id',
      items: [
        { menuItemId: 'menu-item-1', quantity: 2 },
        { menuItemId: 'menu-item-2', quantity: 1 },
      ],
    },
  };

  const mockTerminalFailureSuccess = () => {
    txMock.payment.findUnique.mockResolvedValue(pendingPaymentWithItems);
    txMock.order.updateMany.mockResolvedValue({ count: 1 });
    txMock.payment.updateMany.mockResolvedValue({ count: 1 });
    txMock.menuItem.update.mockResolvedValue({});
    txMock.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'payment-id',
      status: PaymentStatus.FAILED,
    });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );
  };

  it('should handle payment timeout and restore all stock successfully', async () => {
    mockTerminalFailureSuccess();

    await service.handlePaymentTimeout('payment-id');

    expect(txMock.payment.findUnique).toHaveBeenCalledWith({
      where: { id: 'payment-id' },
      include: { order: { include: { items: true } } },
    });
    expect(txMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-id', status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED },
    });
    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-id', status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.FAILED,
        transactionId: expect.stringMatching(/^TIMEOUT_/),
        paidAt: null,
      },
    });
    expect(txMock.menuItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'menu-item-1' },
      data: { stock: { increment: 2 } },
    });
    expect(txMock.menuItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'menu-item-2' },
      data: { stock: { increment: 1 } },
    });
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).toHaveBeenCalledWith('restaurant-id');
  });

  it('should treat a missing or non-pending timeout payment as a no-op', async () => {
    txMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    await service.handlePaymentTimeout('payment-id');

    expect(txMock.order.updateMany).not.toHaveBeenCalled();
    expect(txMock.payment.updateMany).not.toHaveBeenCalled();
    expect(txMock.menuItem.update).not.toHaveBeenCalled();
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should not restore stock for a duplicate timeout', async () => {
    txMock.payment.findUnique.mockResolvedValue(pendingPaymentWithItems);
    txMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    await service.handlePaymentTimeout('payment-id');

    expect(txMock.payment.updateMany).not.toHaveBeenCalled();
    expect(txMock.menuItem.update).not.toHaveBeenCalled();
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should roll back cancellation when timeout loses the payment race', async () => {
    txMock.payment.findUnique.mockResolvedValue(pendingPaymentWithItems);
    txMock.order.updateMany.mockResolvedValue({ count: 1 });
    txMock.payment.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    await service.handlePaymentTimeout('payment-id');

    expect(txMock.menuItem.update).not.toHaveBeenCalled();
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should propagate real stock errors from terminal failure', async () => {
    mockTerminalFailureSuccess();
    txMock.menuItem.update.mockRejectedValue(new Error('Stock update failed'));

    await expect(service.handlePaymentTimeout('payment-id')).rejects.toThrow(
      'Stock update failed',
    );
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should propagate real database errors from terminal failure', async () => {
    const databaseError = new Error('Database unavailable');
    prismaMock.$transaction.mockRejectedValue(databaseError);

    await expect(service.handlePaymentTimeout('payment-id')).rejects.toThrow(
      databaseError,
    );
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  it('should confirm a failed payment by cancelling the order and restoring stock', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-id',
      status: PaymentStatus.PENDING,
      order: {
        customerId: 'customer-id',
        status: OrderStatus.PENDING,
      },
    });
    mockTerminalFailureSuccess();

    const result = await service.confirm('payment-id', 'customer-id', {
      simulate: MockPaymentResult.FAILED,
    });

    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-id', status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.FAILED,
        transactionId: expect.stringMatching(/^MOCK_/),
        paidAt: null,
      },
    });
    expect(txMock.order.updateMany).toHaveBeenCalled();
    expect(txMock.menuItem.update).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      id: 'payment-id',
      status: PaymentStatus.FAILED,
    });
  });

  it('should reject failed confirm when terminal transition is not applied', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-id',
      status: PaymentStatus.PENDING,
      order: {
        customerId: 'customer-id',
        status: OrderStatus.PENDING,
      },
    });
    txMock.payment.findUnique.mockResolvedValue(pendingPaymentWithItems);
    txMock.order.updateMany.mockResolvedValue({ count: 1 });
    txMock.payment.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    await expect(
      service.confirm('payment-id', 'customer-id', {
        simulate: MockPaymentResult.FAILED,
      }),
    ).rejects.toThrow('Only pending payment for a pending order can be failed');

    expect(txMock.payment.updateMany).toHaveBeenCalled();
    expect(txMock.menuItem.update).not.toHaveBeenCalled();
  });

  it('should reject confirm when conditional payment transition loses a race', async () => {
    txMock.payment.findUnique.mockResolvedValue({
      id: 'payment-id',
      status: PaymentStatus.PENDING,
      order: {
        id: 'order-id',
        customerId: 'customer-id',
        restaurantId: 'restaurant-id',
        status: OrderStatus.PENDING,
      },
    });
    txMock.payment.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.confirm('payment-id', 'customer-id', {
        simulate: MockPaymentResult.SUCCESS,
      }),
    ).rejects.toThrow('Only pending payment can be confirmed');

    expect(txMock.payment.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(
      dashboardCacheServiceMock.invalidateByRestaurantId,
    ).not.toHaveBeenCalled();
  });

  describe('SUCCESS transaction conflicts', () => {
    const confirm = () =>
      service.confirm('payment-id', 'customer-id', {
        simulate: MockPaymentResult.SUCCESS,
      });
    const pending = {
      id: 'payment-id',
      status: PaymentStatus.PENDING,
      order: {
        id: 'order-id',
        customerId: 'customer-id',
        restaurantId: 'restaurant-id',
        status: OrderStatus.PENDING,
      },
    };
    beforeEach(() => {
      txMock.payment.findUnique.mockResolvedValue(pending);
      txMock.payment.updateMany.mockResolvedValue({ count: 1 });
      txMock.payment.findUniqueOrThrow.mockResolvedValue({
        id: 'payment-id',
        status: PaymentStatus.PAID,
      });
    });

    it('should reject SUCCESS for a cancelled order', async () => {
      txMock.payment.findUnique.mockResolvedValue({
        ...pending,
        order: { ...pending.order, status: OrderStatus.CANCELLED },
      });
      await expect(confirm()).rejects.toThrow('Cancelled order cannot be paid');
      expect(txMock.payment.updateMany).not.toHaveBeenCalled();
      expect(
        dashboardCacheServiceMock.invalidateByRestaurantId,
      ).not.toHaveBeenCalled();
    });

    it('should retry the whole transaction after a P2034 commit conflict', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('Conflict', {
        code: 'P2034',
        clientVersion: '6.19.3',
      });
      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        await callback(txMock);
        expect(
          dashboardCacheServiceMock.invalidateByRestaurantId,
        ).not.toHaveBeenCalled();
        throw conflict;
      });
      await expect(confirm()).resolves.toEqual({
        id: 'payment-id',
        status: PaymentStatus.PAID,
      });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
      expect(prismaMock.$transaction).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
      expect(txMock.payment.findUnique).toHaveBeenCalledTimes(2);
      expect(
        dashboardCacheServiceMock.invalidateByRestaurantId,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject a freshly cancelled order after P2034', async () => {
      txMock.payment.updateMany.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Conflict', {
          code: 'P2034',
          clientVersion: '6.19.3',
        }),
      );
      txMock.payment.findUnique
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce({
          ...pending,
          order: { ...pending.order, status: OrderStatus.CANCELLED },
        });
      await expect(confirm()).rejects.toThrow('Cancelled order cannot be paid');
      expect(txMock.payment.findUnique).toHaveBeenCalledTimes(2);
      expect(txMock.payment.updateMany).toHaveBeenCalledTimes(1);
      expect(
        dashboardCacheServiceMock.invalidateByRestaurantId,
      ).not.toHaveBeenCalled();
    });

    it.each([
      ['P2034', 3],
      ['P2002', 1],
    ])('should propagate %s after %i attempts', async (code, attempts) => {
      const error = new Prisma.PrismaClientKnownRequestError('Database error', {
        code,
        clientVersion: '6.19.3',
      });
      txMock.payment.updateMany.mockRejectedValue(error);
      await expect(confirm()).rejects.toBe(error);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(attempts);
      expect(txMock.payment.findUnique).toHaveBeenCalledTimes(attempts);
      expect(
        dashboardCacheServiceMock.invalidateByRestaurantId,
      ).not.toHaveBeenCalled();
    });

    it('should propagate other database errors without retry or cache invalidation', async () => {
      const error = new Error('Database unavailable');
      txMock.payment.findUniqueOrThrow.mockRejectedValue(error);
      await expect(confirm()).rejects.toBe(error);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(
        dashboardCacheServiceMock.invalidateByRestaurantId,
      ).not.toHaveBeenCalled();
    });
  });
});
