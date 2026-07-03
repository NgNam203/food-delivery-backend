import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum MockPaymentResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Mock payment result used to simulate gateway response',
    enum: MockPaymentResult,
    example: MockPaymentResult.SUCCESS,
  })
  @IsEnum(MockPaymentResult)
  simulate!: MockPaymentResult;
}
