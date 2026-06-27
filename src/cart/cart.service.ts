import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PrismaService } from 'src/prisma/prisma.service';

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
}
