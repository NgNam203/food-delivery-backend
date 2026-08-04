import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PricingService', () => {
  let service: PricingService;
  let pricingService: any;
  const prismaMock = {
    restaurant: {
      findFirst: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
    },
  };

  const validRestaurant = {
    ownerId: 'owner-1',
  };

  const validCoupon = {
    id: 'coupon-id',
    code: 'WELCOME10',

    ownerId: 'owner-1',

    isActive: true,

    expiredAt: new Date(Date.now() + 60_000),

    usedCount: 5,

    usageLimit: 100,

    discountType: 'PERCENTAGE',

    discountValue: 10,

    minimumOrder: 50,

    maximumDiscount: 20,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(PricingService);
    pricingService = service as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate subtotal correctly', () => {
    const items = [
      {
        quantity: 2,
        priceSnapshot: 10,
      },
      {
        quantity: 3,
        priceSnapshot: 5,
      },
    ];

    const subtotal = service.calculateSubtotal(items);

    expect(subtotal).toBe(35);
  });

  it('should return 0 when item list is empty', () => {
    const subtotal = service.calculateSubtotal([]);

    expect(subtotal).toBe(0);
  });

  it('should calculate subtotal with one item', () => {
    const subtotal = service.calculateSubtotal([
      {
        quantity: 1,
        priceSnapshot: 99.5,
      },
    ]);

    expect(subtotal).toBe(99.5);
  });

  it('should throw when restaurant does not exist', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);
    await expect(
      pricingService.validateCoupon('WELCOME10', 'restaurant-id'),
    ).rejects.toThrow('Restaurant not found');
  });

  it('should throw when coupon does not exist', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(validRestaurant);
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    await expect(
      pricingService.validateCoupon('WELCOME10', 'restaurant-id'),
    ).rejects.toThrow('Invalid coupon');
  });

  it('should throw when coupon does not belong to restaurant owner', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(validRestaurant);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...validCoupon,
      ownerId: 'another-owner',
    });
    await expect(
      pricingService.validateCoupon('WELCOME10', 'restaurant-id'),
    ).rejects.toThrow('Coupon is not valid for this restaurant');
  });

  it('should throw when coupon is inactive', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(validRestaurant);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...validCoupon,
      isActive: false,
    });
    await expect(
      pricingService.validateCoupon('WELCOME10', 'restaurant-id'),
    ).rejects.toThrow('Coupon is inactive');
  });

  it('should throw when coupon has expired', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(validRestaurant);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...validCoupon,
      expiredAt: new Date(Date.now() - 1000),
    });
    await expect(
      pricingService.validateCoupon('WELCOME10', 'restaurant-id'),
    ).rejects.toThrow('Coupon has expired');
  });

  it('should throw when coupon usage limit is exceeded', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(validRestaurant);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...validCoupon,
      usedCount: validCoupon.usageLimit,
    });
    await expect(
      pricingService.validateCoupon('WELCOME10', 'restaurant-id'),
    ).rejects.toThrow('Coupon usage limit exceeded');
  });

  it('should return validated coupon when coupon is valid', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(validRestaurant);
    prismaMock.coupon.findUnique.mockResolvedValue({ ...validCoupon });

    const result = await pricingService.validateCoupon(
      'WELCOME10',
      'restaurant-id',
    );

    expect(result).toEqual({
      id: 'coupon-id',
      code: 'WELCOME10',

      discountType: 'PERCENTAGE',

      discountValue: 10,

      minimumOrder: 50,

      maximumDiscount: 20,
    });
  });
});
