import { DiscountType } from '@prisma/client';

export type ValidatedCoupon = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrder: number;
  maximumDiscount: number | null;
};
