import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemData } from './types/order-item-data.type';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}
  private async buildOrderItems(dto: CreateOrderDto): Promise<OrderItemData[]> {
    const result: OrderItemData[] = [];

    for (const item of dto.items) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: {
          id: item.menuItemId,
          deletedAt: null,
          isAvailable: true,
        },
        include: {
          restaurant: true,
        },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      result.push({
        menuItemId: menuItem.id,
        quantity: item.quantity,
        priceSnapshot: Number(menuItem.price),
        menuItemNameSnapshot: menuItem.name,
        restaurantId: menuItem.restaurantId,
      });
    }

    const restaurantIds = new Set(result.map((item) => item.restaurantId));

    if (restaurantIds.size > 1) {
      throw new BadRequestException(
        'All menu items must belong to the same restaurant',
      );
    }

    return result;
  }

  private calculateTotalAmount(items: OrderItemData[]): number {
    return items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.quantity,
      0,
    );
  }

  async create(customerId: string, dto: CreateOrderDto) {
    const orderItems = await this.buildOrderItems(dto);

    const totalAmount = this.calculateTotalAmount(orderItems);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          restaurantId: orderItems[0].restaurantId,
          totalAmount,
        },
      });

      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          menuItemNameSnapshot: item.menuItemNameSnapshot,
        })),
      });

      return order;
    });
  }

  async findMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: {
        customerId,
      },
      include: {
        items: true,
        restaurant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findRestaurantOrders(restaurantId: string, ownerId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        deletedAt: null,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You are not allowed to access this restaurant',
      );
    }

    return this.prisma.order.findMany({
      where: {
        restaurantId,
      },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
