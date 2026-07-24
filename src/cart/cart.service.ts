import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma } from '@prisma/client';
import { OrderService } from '../order/order.service';
import { OrderItemData } from '../order/types/order-item-data.type';
import { PricingService } from '../pricing/pricing.service';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly pricingService: PricingService,
    private readonly dashboardCacheService: DashboardCacheService,
  ) {}

  private async findOrCreateCart(customerId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: {
        customerId,
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          customerId,
        },
      });
    }

    return cart;
  }

  async addItem(customerId: string, dto: AddCartItemDto) {
    const cart = await this.findOrCreateCart(customerId);
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id: dto.menuItemId,
        deletedAt: null,
      },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }
    if (!menuItem.isAvailable) {
      throw new BadRequestException(`${menuItem.name} is unavailable`);
    }
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_menuItemId: {
          cartId: cart.id,
          menuItemId: dto.menuItemId,
        },
      },
    });
    if (existingCartItem) {
      return this.prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: {
            increment: dto.quantity,
          },
        },
      });
    }
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: dto.menuItemId,
        quantity: dto.quantity,
      },
    });
  }

  async findMyCart(customerId: string) {
    const cart = await this.findOrCreateCart(customerId);
    return this.prisma.cart.findUnique({
      where: {
        id: cart.id,
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateQuantity(
    customerId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.findOrCreateCart(customerId);
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }
    return this.prisma.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        quantity: dto.quantity,
      },
    });
  }

  async removeItem(customerId: string, cartItemId: string) {
    const cart = await this.findOrCreateCart(customerId);
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: cartItem.id,
      },
    });

    return {
      message: 'Cart item removed successfully',
    };
  }

  async clearCart(customerId: string) {
    const cart = await this.findOrCreateCart(customerId);
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });
    return {
      message: 'Cart cleared successfully',
    };
  }

  private validateCartItems(cart: {
    items: {
      quantity: number;
      menuItem: {
        id: string;
        name: string;
        deletedAt: Date | null;
        isAvailable: boolean;
        stock: number;
        restaurantId: string;
        price: Prisma.Decimal;
      };
    }[];
  }) {
    for (const item of cart.items) {
      if (item.menuItem.deletedAt) {
        throw new BadRequestException(`${item.menuItem.name} has been deleted`);
      }
      if (!item.menuItem.isAvailable) {
        throw new BadRequestException(`${item.menuItem.name} is unavailable`);
      }
      if (item.menuItem.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.menuItem.name}`,
        );
      }
    }
  }

  async checkout(customerId: string, dto: CheckoutCartDto) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        customerId,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    this.validateCartItems(cart);

    const orderItems: OrderItemData[] = cart.items.map((item) => ({
      menuItemId: item.menuItem.id,
      quantity: item.quantity,
      priceSnapshot: Number(item.menuItem.price),
      menuItemNameSnapshot: item.menuItem.name,
      restaurantId: item.menuItem.restaurantId,
    }));

    const pricing = await this.pricingService.calculatePricing(
      orderItems,
      dto.couponCode,
    );

    const restaurantIds = new Set(
      cart.items.map((item) => item.menuItem.restaurantId),
    );

    if (restaurantIds.size > 1) {
      throw new BadRequestException(
        'All cart items must belong to the same restaurant',
      );
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await this.orderService.createOrderWithTransaction(
        tx,
        customerId,
        orderItems,
        pricing,
      );

      if (pricing.couponId) {
        await tx.coupon.update({
          where: {
            id: pricing.couponId,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return order;
    });

    await this.dashboardCacheService.invalidateByRestaurantId(
      order.restaurantId,
    );

    return order;
  }
}
