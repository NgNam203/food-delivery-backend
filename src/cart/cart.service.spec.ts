import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { PricingService } from '../pricing/pricing.service';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';

describe('CartService', () => {
  let service: CartService;
  const prismaMock = {
    cart: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const orderServiceMock = { createOrderWithTransaction: jest.fn() };
  const pricingServiceMock = { calculatePricing: jest.fn() };
  const cacheMock = { invalidateByRestaurantId: jest.fn() };
  const txMock = {
    coupon: { update: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
  };
  const pricing = {
    subtotal: 26,
    discountAmount: 5,
    totalAmount: 21,
    couponId: 'coupon-1',
    couponCode: 'SAVE5',
  };
  const createdOrder = { id: 'order-1', restaurantId: 'restaurant-1' };
  const makeCart = () => ({
    id: 'cart-1',
    items: [
      {
        quantity: 2,
        menuItem: {
          id: 'burger-1',
          name: 'Burger',
          price: new Prisma.Decimal('10.50'),
          stock: 5,
          deletedAt: null,
          isAvailable: true,
          restaurantId: 'restaurant-1',
        },
      },
      {
        quantity: 1,
        menuItem: {
          id: 'fries-1',
          name: 'Fries',
          price: new Prisma.Decimal('5'),
          stock: 3,
          deletedAt: null,
          isAvailable: true,
          restaurantId: 'restaurant-1',
        },
      },
    ],
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: OrderService, useValue: orderServiceMock },
        { provide: PricingService, useValue: pricingServiceMock },
        { provide: DashboardCacheService, useValue: cacheMock },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prismaMock.cart.findUnique.mockResolvedValue(makeCart());
    pricingServiceMock.calculatePricing.mockResolvedValue(pricing);
    orderServiceMock.createOrderWithTransaction.mockResolvedValue(createdOrder);
    txMock.coupon.update.mockResolvedValue({});
    txMock.cartItem.deleteMany.mockResolvedValue({ count: 2 });
    cacheMock.invalidateByRestaurantId.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );
  });

  it('rejects insufficient stock before pricing or starting a transaction', async () => {
    const cart = makeCart();
    cart.items[1].menuItem.stock = 0;
    prismaMock.cart.findUnique.mockResolvedValue(cart);

    await expect(
      service.checkout('customer-1', { couponCode: 'SAVE5' }),
    ).rejects.toThrow('Insufficient stock for Fries');

    expect(pricingServiceMock.calculatePricing).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(orderServiceMock.createOrderWithTransaction).not.toHaveBeenCalled();
  });

  it('rejects items from multiple restaurants before pricing or starting a transaction', async () => {
    const cart = makeCart();
    cart.items[1].menuItem.restaurantId = 'restaurant-2';
    prismaMock.cart.findUnique.mockResolvedValue(cart);

    await expect(
      service.checkout('customer-1', { couponCode: 'SAVE5' }),
    ).rejects.toThrow('All cart items must belong to the same restaurant');

    expect(pricingServiceMock.calculatePricing).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(orderServiceMock.createOrderWithTransaction).not.toHaveBeenCalled();
  });

  it('checks out with a coupon and invalidates cache only after the transaction succeeds', async () => {
    const snapshots = [
      {
        menuItemId: 'burger-1',
        quantity: 2,
        priceSnapshot: 10.5,
        menuItemNameSnapshot: 'Burger',
        restaurantId: 'restaurant-1',
      },
      {
        menuItemId: 'fries-1',
        quantity: 1,
        priceSnapshot: 5,
        menuItemNameSnapshot: 'Fries',
        restaurantId: 'restaurant-1',
      },
    ];
    let finishTransaction!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      finishTransaction = resolve;
    });
    let callbackFinished!: () => void;
    const callbackDone = new Promise<void>((resolve) => {
      callbackFinished = resolve;
    });
    prismaMock.$transaction.mockImplementation(async (callback) => {
      try {
        const order = await callback(txMock);
        callbackFinished();
        await transactionGate;
        return order;
      } finally {
        callbackFinished();
      }
    });

    const checkout = service.checkout('customer-1', { couponCode: 'SAVE5' });
    await callbackDone;
    try {
      expect(cacheMock.invalidateByRestaurantId).not.toHaveBeenCalled();
    } finally {
      finishTransaction();
    }

    await expect(checkout).resolves.toBe(createdOrder);
    expect(pricingServiceMock.calculatePricing).toHaveBeenCalledWith(
      snapshots,
      'restaurant-1',
      'SAVE5',
    );
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(orderServiceMock.createOrderWithTransaction).toHaveBeenCalledTimes(1);
    expect(orderServiceMock.createOrderWithTransaction).toHaveBeenCalledWith(
      txMock,
      'customer-1',
      snapshots,
      pricing,
    );
    expect(orderServiceMock.createOrderWithTransaction.mock.calls[0][0]).toBe(
      txMock,
    );
    expect(orderServiceMock.createOrderWithTransaction.mock.calls[0][3]).toBe(
      pricing,
    );
    expect(txMock.coupon.update).toHaveBeenCalledTimes(1);
    expect(txMock.coupon.update).toHaveBeenCalledWith({
      where: { id: 'coupon-1' },
      data: { usedCount: { increment: 1 } },
    });
    expect(txMock.cartItem.deleteMany).toHaveBeenCalledTimes(1);
    expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-1' },
    });
    expect(cacheMock.invalidateByRestaurantId).toHaveBeenCalledTimes(1);
    expect(cacheMock.invalidateByRestaurantId).toHaveBeenCalledWith(
      'restaurant-1',
    );
  });

  it('propagates order creation failure without coupon usage, cart cleanup or cache invalidation', async () => {
    const error = new Error('Order creation failed');
    orderServiceMock.createOrderWithTransaction.mockRejectedValue(error);

    await expect(
      service.checkout('customer-1', { couponCode: 'SAVE5' }),
    ).rejects.toBe(error);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(orderServiceMock.createOrderWithTransaction).toHaveBeenCalledTimes(1);
    expect(txMock.coupon.update).not.toHaveBeenCalled();
    expect(txMock.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(cacheMock.invalidateByRestaurantId).not.toHaveBeenCalled();
  });
});
