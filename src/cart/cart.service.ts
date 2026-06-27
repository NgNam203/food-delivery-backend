import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

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
}
