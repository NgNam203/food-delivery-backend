import { IsEnum } from 'class-validator';

export enum MockPaymentResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ConfirmPaymentDto {
  @IsEnum(MockPaymentResult)
  simulate!: MockPaymentResult;
}
