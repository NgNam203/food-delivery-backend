import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Create a new order from menu items. All menu items must belong to the same restaurant.',
  })
  @ApiCreatedResponse({
    description: 'Order created successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed, insufficient stock, unavailable menu item, or menu items belong to different restaurants.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Menu item not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user.userId, dto);
  }

  @ApiOperation({
    summary: 'Get my orders',
    description:
      'Retrieve all orders created by the authenticated customer with optional pagination and status filtering.',
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('me')
  findMyOrders(@CurrentUser() user: JwtPayload, @Query() query: OrderQueryDto) {
    return this.orderService.findMyOrders(user.userId, query);
  }

  @ApiOperation({
    summary: 'Get restaurant orders',
    description:
      'Retrieve all orders of a restaurant owned by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Restaurant orders retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to access this restaurant.',
  })
  @ApiNotFoundResponse({
    description: 'Restaurant not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('restaurant/:restaurantId')
  findRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.findRestaurantOrders(
      restaurantId,
      user.userId,
      query,
    );
  }

  @ApiOperation({
    summary: 'Update order status',
    description:
      'Update the status of an order following the allowed order status transitions.',
  })
  @ApiOkResponse({
    description: 'Order status updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid order status transition.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to update this order.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
  })
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

  @ApiOperation({
    summary: 'Get order details',
    description:
      'Retrieve detailed information of an order. Customers can only access their own orders, while owners can only access orders belonging to their restaurants.',
  })
  @ApiOkResponse({
    description: 'Order details retrieved successfully.',
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
  @Roles(UserRole.CUSTOMER, UserRole.OWNER)
  @Get(':id')
  findDetail(@Param('id') orderId: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.findDetail(orderId, user.userId, user.role);
  }
}
