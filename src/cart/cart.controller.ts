import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CartService } from './cart.service';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({
    summary: 'Add item to cart',
    description:
      'Add a menu item to the authenticated customer cart. If the item already exists, its quantity will be increased.',
  })
  @ApiOkResponse({
    description: 'Item added to cart successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Menu item is unavailable.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Menu item not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('items')
  addItem(@CurrentUser() user: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.userId, dto);
  }

  @ApiOperation({
    summary: 'Get my cart',
    description:
      'Retrieve the current shopping cart of the authenticated customer.',
  })
  @ApiOkResponse({
    description: 'Cart retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get()
  findMyCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.findMyCart(user.userId);
  }

  @ApiOperation({
    summary: 'Update cart item quantity',
    description:
      'Update the quantity of a specific cart item belonging to the authenticated customer.',
  })
  @ApiOkResponse({
    description: 'Cart item updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Cart item not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Patch('items/:cartItemId')
  updateQuantity(
    @CurrentUser() user: JwtPayload,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(user.userId, cartItemId, dto);
  }

  @ApiOperation({
    summary: 'Remove cart item',
    description: 'Remove a specific item from the authenticated customer cart.',
  })
  @ApiOkResponse({
    description: 'Cart item removed successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Cart item not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Delete('items/:cartItemId')
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('cartItemId') cartItemId: string,
  ) {
    return this.cartService.removeItem(user.userId, cartItemId);
  }

  @ApiOperation({
    summary: 'Clear cart',
    description: 'Remove all items from the authenticated customer cart.',
  })
  @ApiOkResponse({
    description: 'Cart cleared successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Delete()
  clearCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.clearCart(user.userId);
  }

  @ApiOperation({
    summary: 'Checkout cart',
    description:
      'Create an order from the current cart. The cart will be cleared after a successful checkout. A coupon code can optionally be applied.',
  })
  @ApiOkResponse({
    description: 'Checkout completed successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Cart is empty, coupon is invalid, menu item is unavailable, insufficient stock, or cart contains items from different restaurants.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Menu item not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('checkout')
  checkout(@CurrentUser() user: JwtPayload, @Body() dto: CheckoutCartDto) {
    return this.cartService.checkout(user.userId, dto);
  }
}
