import { DiscountType, PrismaClient } from '@prisma/client';

export async function seedCoupons(prisma: PrismaClient) {
  const owner = await prisma.user.findUnique({
    where: {
      email: 'owner@example.com',
    },
  });

  if (!owner) {
    throw new Error('Owner not found');
  }

  const coupons = [
    {
      code: 'WELCOME10',
      description: '10% discount for new customers',

      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,

      minimumOrder: 50,

      maximumDiscount: 20,

      usageLimit: 100,

      isActive: true,
    },

    {
      code: 'SAVE50',
      description: 'Save $50 on large orders',

      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50,

      minimumOrder: 200,

      maximumDiscount: null,

      usageLimit: 50,

      isActive: true,
    },
  ];

  const expiredAt = new Date();

  expiredAt.setFullYear(expiredAt.getFullYear() + 5);

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: {
        code: coupon.code,
      },

      update: {},

      create: {
        ownerId: owner.id,

        code: coupon.code,

        description: coupon.description,

        discountType: coupon.discountType,

        discountValue: coupon.discountValue,

        minimumOrder: coupon.minimumOrder,

        maximumDiscount: coupon.maximumDiscount,

        usageLimit: coupon.usageLimit,

        isActive: coupon.isActive,

        expiredAt,
      },
    });
  }
}
