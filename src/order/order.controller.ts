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
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { JwtPayload } from 'src/auth/types/jwt-payload.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('me')
  findMyOrders(@CurrentUser() user: JwtPayload) {
    return this.orderService.findMyOrders(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('restaurant/:restaurantId')
  findRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderService.findRestaurantOrders(restaurantId, user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') orderId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(orderId, user.userId, dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.OWNER)
  @Get(':id')
  findDetail(@Param('id') orderId: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.findDetail(orderId, user.userId, user.role);
  }
}
