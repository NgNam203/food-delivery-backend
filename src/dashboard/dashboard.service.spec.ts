import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const ownerId = 'owner-1';
  const restaurantIds = ['restaurant-1', 'restaurant-2'];
  const prismaMock = {
    restaurant: { findMany: jest.fn() },
    order: { count: jest.fn(), aggregate: jest.fn() },
    payment: { count: jest.fn(), groupBy: jest.fn() },
    orderItem: { groupBy: jest.fn() },
  };
  const cacheMock = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    cacheMock.get.mockResolvedValue(null);
    cacheMock.set.mockResolvedValue(undefined);
    prismaMock.restaurant.findMany.mockResolvedValue(
      restaurantIds.map((id) => ({ id })),
    );
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    prismaMock.payment.count.mockResolvedValue(0);
    prismaMock.payment.groupBy.mockResolvedValue([]);
    prismaMock.orderItem.groupBy.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: DashboardCacheService, useValue: cacheMock },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('scopes all aggregates to the requested owner and non-deleted restaurants', async () => {
    await service.getOwnerDashboard(ownerId);

    expect(prismaMock.restaurant.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.restaurant.findMany).toHaveBeenCalledWith({
      where: { ownerId, deletedAt: null },
      select: { id: true },
    });
    expect(prismaMock.order.count).toHaveBeenCalledTimes(4);
    expect(prismaMock.order.aggregate).toHaveBeenCalledTimes(3);
    for (const query of [prismaMock.order.count, prismaMock.order.aggregate]) {
      for (const [args] of query.mock.calls) {
        expect(args.where.restaurantId).toEqual({ in: restaurantIds });
      }
    }
    expect(prismaMock.payment.count).toHaveBeenCalledTimes(3);
    expect(prismaMock.payment.groupBy).toHaveBeenCalledTimes(1);
    expect(prismaMock.orderItem.groupBy).toHaveBeenCalledTimes(1);
    for (const query of [
      prismaMock.payment.count,
      prismaMock.payment.groupBy,
      prismaMock.orderItem.groupBy,
    ]) {
      for (const [args] of query.mock.calls) {
        expect(args.where.order.restaurantId).toEqual({ in: restaurantIds });
      }
    }
  });

  it('includes only completed orders in revenue with local day and month boundaries', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 17, 14, 35, 42));
    const totalRevenue = { _sum: { totalAmount: new Prisma.Decimal('900') } };
    const revenueToday = { _sum: { totalAmount: new Prisma.Decimal('75') } };
    const revenueThisMonth = { _sum: { totalAmount: new Prisma.Decimal('350') } };
    prismaMock.order.aggregate
      .mockResolvedValueOnce(totalRevenue)
      .mockResolvedValueOnce(revenueToday)
      .mockResolvedValueOnce(revenueThisMonth);

    const result = await service.getOwnerDashboard(ownerId);

    const revenueFilter = {
      restaurantId: { in: restaurantIds },
      status: OrderStatus.COMPLETED,
    };
    expect(prismaMock.order.aggregate).toHaveBeenCalledTimes(3);
    expect(prismaMock.order.aggregate).toHaveBeenCalledWith({
      where: revenueFilter,
      _sum: { totalAmount: true },
    });
    expect(prismaMock.order.aggregate).toHaveBeenCalledWith({
      where: {
        ...revenueFilter,
        createdAt: { gte: new Date(2026, 8, 17, 0, 0, 0, 0) },
      },
      _sum: { totalAmount: true },
    });
    expect(prismaMock.order.aggregate).toHaveBeenCalledWith({
      where: {
        ...revenueFilter,
        createdAt: { gte: new Date(2026, 8, 1, 0, 0, 0, 0) },
      },
      _sum: { totalAmount: true },
    });
    expect(result).toMatchObject({
      totalRevenue,
      revenueToday,
      revenueThisMonth,
    });
  });

  it('groups only paid payments and returns zeros for missing payment methods', async () => {
    prismaMock.payment.groupBy.mockResolvedValue([
      {
        method: PaymentMethod.MOMO,
        _count: { id: 3 },
        _sum: { amount: new Prisma.Decimal('125.50') },
      },
    ]);

    const result = await service.getOwnerDashboard(ownerId);

    expect(prismaMock.payment.groupBy).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.groupBy).toHaveBeenCalledWith({
      by: ['method'],
      where: {
        order: { restaurantId: { in: restaurantIds } },
        status: PaymentStatus.PAID,
      },
      _count: { id: true },
      _sum: { amount: true },
    });
    expect(result.paymentMethods).toHaveLength(Object.values(PaymentMethod).length);
    expect(result.paymentMethods).toEqual(
      expect.arrayContaining([
        { method: PaymentMethod.MOMO, count: 3, revenue: 125.5 },
        { method: PaymentMethod.COD, count: 0, revenue: 0 },
        { method: PaymentMethod.VNPAY, count: 0, revenue: 0 },
        { method: PaymentMethod.STRIPE, count: 0, revenue: 0 },
      ]),
    );
  });

  it('bypasses Prisma on cache hit and aggregates and caches by owner on miss', async () => {
    const cached = { totalOrders: 12, paymentMethods: [] };
    cacheMock.get.mockResolvedValueOnce(cached).mockResolvedValueOnce(null);

    await expect(service.getOwnerDashboard(ownerId)).resolves.toBe(cached);
    expect(cacheMock.get).toHaveBeenNthCalledWith(1, ownerId);
    for (const model of Object.values(prismaMock)) {
      for (const query of Object.values(model)) {
        expect(query).not.toHaveBeenCalled();
      }
    }
    expect(cacheMock.set).not.toHaveBeenCalled();

    const result = await service.getOwnerDashboard(ownerId);

    expect(cacheMock.get).toHaveBeenCalledTimes(2);
    expect(cacheMock.get).toHaveBeenNthCalledWith(2, ownerId);
    for (const model of Object.values(prismaMock)) {
      for (const query of Object.values(model)) {
        expect(query).toHaveBeenCalled();
      }
    }
    expect(result).not.toBe(cached);
    expect(result.totalOrders).toBe(0);
    expect(cacheMock.set).toHaveBeenCalledTimes(1);
    expect(cacheMock.set).toHaveBeenCalledWith(ownerId, result);
    expect(cacheMock.set.mock.calls[0][1]).toBe(result);
  });
});
