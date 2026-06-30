import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { PaymentService } from './payment.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('orders/:orderId')
  create(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(orderId, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Patch(':paymentId/confirm')
  confirm(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirm(paymentId, user.userId, dto);
  }
}
