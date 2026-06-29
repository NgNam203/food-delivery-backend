export type Pricing = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  couponId?: string;
  couponCode?: string;
};
