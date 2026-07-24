import { BadRequestException, Injectable } from '@nestjs/common';

import { ValidatedCoupon } from './types/validated-coupon.type';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType } from '@prisma/client';
import { Pricing } from './types/pricing.type';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  calculateSubtotal(
    items: {
      quantity: number;
      priceSnapshot: number;
    }[],
  ): number {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.priceSnapshot,
      0,
    );
  }

  private async validateCoupon(
    couponCode: string,
    restaurantId: string,
  ): Promise<ValidatedCoupon> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        deletedAt: null,
      },
      select: {
        ownerId: true,
      },
    });

    if (!restaurant) {
      throw new BadRequestException('Restaurant not found');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: {
        code: couponCode.trim().toUpperCase(),
      },
    });
    if (!coupon) {
      throw new BadRequestException('Invalid coupon');
    }
    if (coupon.ownerId !== restaurant.ownerId) {
      throw new BadRequestException('Coupon is not valid for this restaurant');
    }
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive');
    }
    if (coupon.expiredAt < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minimumOrder: Number(coupon.minimumOrder),
      maximumDiscount:
        coupon.maximumDiscount === null ? null : Number(coupon.maximumDiscount),
    };
  }

  private calculateDiscount(subtotal: number, coupon: ValidatedCoupon): number {
    if (subtotal < coupon.minimumOrder) {
      throw new BadRequestException(`Minimum order is ${coupon.minimumOrder}`);
    }

    let discount = 0;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = subtotal * (coupon.discountValue / 100);
    }

    if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discount = coupon.discountValue;
    }

    if (coupon.maximumDiscount !== null) {
      discount = Math.min(discount, coupon.maximumDiscount);
    }

    discount = Math.min(discount, subtotal);

    return discount;
  }

  async calculatePricing(
    items: {
      quantity: number;
      priceSnapshot: number;
    }[],
    restaurantId: string,
    couponCode?: string,
  ): Promise<Pricing> {
    const subtotal = this.calculateSubtotal(items);

    if (!couponCode) {
      return {
        subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
      };
    }

    const coupon = await this.validateCoupon(couponCode, restaurantId);

    const discountAmount = this.calculateDiscount(subtotal, coupon);

    return {
      subtotal,
      discountAmount,
      totalAmount: subtotal - discountAmount,
      couponId: coupon.id,
      couponCode: coupon.code,
    };
  }
}
