import { IsEnum } from 'class-validator';

import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
