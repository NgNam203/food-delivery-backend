import { IsOptional, IsString } from 'class-validator';

export class CheckoutCartDto {
  @IsOptional()
  @IsString()
  couponCode?: string;
}
