import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';
import type { OrderItemData } from './types/order-item-data.type';
import type { Pricing } from '../pricing/types/pricing.type';

describe('OrderService', () => {
  let service: OrderService;

  const prismaMock = {
    menuItem: {
      findFirst: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    restaurant: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const dashboardCacheServiceMock = {
    invalidate: jest.fn(),
  };

  const txMock = {
    order: {
      create: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
    },
    menuItem: {
      updateMany: jest.fn(),
    },
  };

  const validOrderItems: OrderItemData[] = [
    {
      menuItemId: 'menu-item-1',
      quantity: 2,
      priceSnapshot: 10,
      menuItemNameSnapshot: 'Burger',
      restaurantId: 'restaurant-1',
    },
    {
      menuItemId: 'menu-item-2',
      quantity: 1,
      priceSnapshot: 5,
      menuItemNameSnapshot: 'Fries',
      restaurantId: 'restaurant-1',
    },
  ];

  const validPricing: Pricing = {
    subtotal: 25,
    discountAmount: 5,
    totalAmount: 20,
    couponId: 'coupon-id',
    couponCode: 'WELCOME10',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: DashboardCacheService,
          useValue: dashboardCacheServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);

    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create order and decrease stock successfully', async () => {
    const customerId = 'customer-id';

    const createdOrder = {
      id: 'order-id',
      customerId,
      restaurantId: 'restaurant-1',
      subtotal: 25,
      discountAmount: 5,
      totalAmount: 20,
    };

    txMock.order.create.mockResolvedValue(createdOrder);
    txMock.orderItem.createMany.mockResolvedValue({
      count: validOrderItems.length,
    });
    txMock.menuItem.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.createOrderWithTransaction(
      txMock as unknown as Prisma.TransactionClient,
      customerId,
      validOrderItems,
      validPricing,
    );

    expect(txMock.order.create).toHaveBeenCalledWith({
      data: {
        customerId,
        restaurantId: 'restaurant-1',
        subtotal: 25,
        discountAmount: 5,
        totalAmount: 20,
        couponId: 'coupon-id',
        couponCode: 'WELCOME10',
      },
    });

    expect(txMock.orderItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId: 'order-id',
          menuItemId: 'menu-item-1',
          quantity: 2,
          priceSnapshot: 10,
          menuItemNameSnapshot: 'Burger',
        },
        {
          orderId: 'order-id',
          menuItemId: 'menu-item-2',
          quantity: 1,
          priceSnapshot: 5,
          menuItemNameSnapshot: 'Fries',
        },
      ],
    });

    expect(txMock.menuItem.updateMany).toHaveBeenCalledTimes(2);

    expect(txMock.menuItem.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'menu-item-1',
        stock: {
          gte: 2,
        },
      },
      data: {
        stock: {
          decrement: 2,
        },
      },
    });

    expect(txMock.menuItem.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'menu-item-2',
        stock: {
          gte: 1,
        },
      },
      data: {
        stock: {
          decrement: 1,
        },
      },
    });

    expect(result).toEqual(createdOrder);
  });

  it('should throw when stock cannot be decreased', async () => {
    const customerId = 'customer-id';

    txMock.order.create.mockResolvedValue({
      id: 'order-id',
    });

    txMock.orderItem.createMany.mockResolvedValue({
      count: validOrderItems.length,
    });

    txMock.menuItem.updateMany
      .mockResolvedValueOnce({
        count: 1,
      })
      .mockResolvedValueOnce({
        count: 0,
      });

    await expect(
      service.createOrderWithTransaction(
        txMock as unknown as Prisma.TransactionClient,
        customerId,
        validOrderItems,
        validPricing,
      ),
    ).rejects.toThrow('Insufficient stock for Fries');

    expect(txMock.menuItem.updateMany).toHaveBeenCalledTimes(2);
  });

  it('should create order successfully', async () => {
    const customerId = 'customer-id';

    const dto = {
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 2,
        },
      ],
    };

    prismaMock.menuItem.findFirst.mockResolvedValue({
      id: 'menu-item-1',
      name: 'Burger',
      stock: 10,
      isAvailable: true,
      price: 10,
      restaurantId: 'restaurant-1',
      restaurant: {
        id: 'restaurant-1',
      },
    });

    const createdOrder = {
      id: 'order-id',
    };

    jest
      .spyOn(service, 'createOrderWithTransaction')
      .mockResolvedValue(createdOrder);

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return callback(txMock);
    });

    const result = await service.create(customerId, dto);

    expect(prismaMock.menuItem.findFirst).toHaveBeenCalledTimes(1);

    expect(service.createOrderWithTransaction).toHaveBeenCalledTimes(1);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    expect(result).toEqual(createdOrder);
  });

  it('should throw when menu item does not exist', async () => {
    const customerId = 'customer-id';

    const dto = {
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 2,
        },
      ],
    };

    prismaMock.menuItem.findFirst.mockResolvedValue(null);

    await expect(service.create(customerId, dto)).rejects.toThrow(
      'Menu item not found',
    );

    expect(prismaMock.menuItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'menu-item-1',
        deletedAt: null,
      },
      include: {
        restaurant: true,
      },
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should throw when menu item is unavailable', async () => {
    const customerId = 'customer-id';

    const dto = {
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 2,
        },
      ],
    };

    prismaMock.menuItem.findFirst.mockResolvedValue({
      id: 'menu-item-1',
      name: 'Burger',
      stock: 10,
      isAvailable: false,
      price: 10,
      restaurantId: 'restaurant-1',
      restaurant: {
        id: 'restaurant-1',
      },
    });

    await expect(service.create(customerId, dto)).rejects.toThrow(
      'Burger is unavailable',
    );

    expect(prismaMock.menuItem.findFirst).toHaveBeenCalledTimes(1);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should throw when menu item does not have enough stock', async () => {
    const customerId = 'customer-id';

    const dto = {
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 5,
        },
      ],
    };

    prismaMock.menuItem.findFirst.mockResolvedValue({
      id: 'menu-item-1',
      name: 'Burger',
      stock: 2,
      isAvailable: true,
      price: 10,
      restaurantId: 'restaurant-1',
      restaurant: {
        id: 'restaurant-1',
      },
    });

    await expect(service.create(customerId, dto)).rejects.toThrow(
      'Insufficient stock for Burger',
    );

    expect(prismaMock.menuItem.findFirst).toHaveBeenCalledTimes(1);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should throw when menu items belong to different restaurants', async () => {
    const customerId = 'customer-id';

    const dto = {
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 1,
        },
        {
          menuItemId: 'menu-item-2',
          quantity: 1,
        },
      ],
    };

    prismaMock.menuItem.findFirst
      .mockResolvedValueOnce({
        id: 'menu-item-1',
        name: 'Burger',
        stock: 10,
        isAvailable: true,
        price: 10,
        restaurantId: 'restaurant-1',
        restaurant: {
          id: 'restaurant-1',
        },
      })
      .mockResolvedValueOnce({
        id: 'menu-item-2',
        name: 'Pizza',
        stock: 10,
        isAvailable: true,
        price: 20,
        restaurantId: 'restaurant-2',
        restaurant: {
          id: 'restaurant-2',
        },
      });

    await expect(service.create(customerId, dto)).rejects.toThrow(
      'All menu items must belong to the same restaurant',
    );

    expect(prismaMock.menuItem.findFirst).toHaveBeenCalledTimes(2);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should update order status successfully', async () => {
    const orderId = 'order-id';
    const ownerId = 'owner-id';
    const nextStatus = OrderStatus.CONFIRMED;

    prismaMock.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderStatus.PENDING,
      restaurant: {
        ownerId,
      },
    });

    const updatedOrder = {
      id: orderId,
      status: OrderStatus.CONFIRMED,
    };

    prismaMock.order.update.mockResolvedValue(updatedOrder);

    dashboardCacheServiceMock.invalidate.mockResolvedValue(undefined);

    const result = await service.updateStatus(orderId, ownerId, nextStatus);

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: orderId,
      },
      include: {
        restaurant: true,
      },
    });

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.CONFIRMED,
      },
    });

    expect(dashboardCacheServiceMock.invalidate).toHaveBeenCalledTimes(1);

    expect(dashboardCacheServiceMock.invalidate).toHaveBeenCalledWith(ownerId);

    expect(result).toEqual(updatedOrder);
  });

  it('should throw when order does not exist', async () => {
    const orderId = 'order-id';
    const ownerId = 'owner-id';

    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(
      service.updateStatus(orderId, ownerId, OrderStatus.CONFIRMED),
    ).rejects.toThrow('Order not found');

    expect(prismaMock.order.findFirst).toHaveBeenCalledTimes(1);

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(dashboardCacheServiceMock.invalidate).not.toHaveBeenCalled();
  });

  it('should throw when owner is not allowed to update order', async () => {
    const orderId = 'order-id';

    prismaMock.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderStatus.PENDING,
      restaurant: {
        ownerId: 'another-owner',
      },
    });

    await expect(
      service.updateStatus(orderId, 'owner-id', OrderStatus.CONFIRMED),
    ).rejects.toThrow('You are not allowed to update this order');

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(dashboardCacheServiceMock.invalidate).not.toHaveBeenCalled();
  });

  it('should throw when order status transition is invalid', async () => {
    const orderId = 'order-id';
    const ownerId = 'owner-id';

    prismaMock.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderStatus.PENDING,
      restaurant: {
        ownerId,
      },
    });

    await expect(
      service.updateStatus(orderId, ownerId, OrderStatus.PREPARING),
    ).rejects.toThrow('Cannot change order status from PENDING to PREPARING');

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(dashboardCacheServiceMock.invalidate).not.toHaveBeenCalled();
  });
});
