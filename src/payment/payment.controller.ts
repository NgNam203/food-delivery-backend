import {
  Body,
  Controller,
  Get,
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
import { PaymentQueueService } from '../queue/payment-queue/payment-queue.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentQueueService: PaymentQueueService,
  ) {}

  @ApiOperation({
    summary: 'Create payment',
    description:
      'Create a pending payment for an order owned by the authenticated customer.',
  })
  @ApiCreatedResponse({
    description: 'Payment created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Order is cancelled or payment already exists.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
  })
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

  @ApiOperation({
    summary: 'Confirm mock payment',
    description: 'Simulate a payment gateway result and update payment status.',
  })
  @ApiOkResponse({
    description: 'Payment confirmed successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Only pending payment can be confirmed or validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied.',
  })
  @ApiNotFoundResponse({
    description: 'Payment not found.',
  })
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

  @ApiOperation({
    summary: 'Get my payments',
    description: 'Retrieve payment history of the authenticated customer.',
  })
  @ApiOkResponse({
    description: 'Payments retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('me')
  findMyPayments(@CurrentUser() user: JwtPayload) {
    return this.paymentService.findMyPayments(user.userId);
  }

  @ApiOperation({
    summary: 'Test payment timeout job',
    description:
      'Temporary endpoint used to test BullMQ delayed payment timeout jobs.',
  })
  @ApiCreatedResponse({
    description: 'Payment timeout job queued successfully.',
  })
  @Post('test-job')
  async testJob() {
    await this.paymentQueueService.schedulePaymentTimeout('test-payment');

    return {
      message: 'Job queued',
    };
  }
}
