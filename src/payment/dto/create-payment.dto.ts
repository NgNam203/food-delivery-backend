import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment method used by the customer',
    enum: PaymentMethod,
    example: PaymentMethod.MOMO,
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
