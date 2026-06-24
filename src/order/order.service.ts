import { Injectable, NotFoundException } from '@nestjs/common';
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
      });
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

    const firstMenuItem = await this.prisma.menuItem.findUnique({
      where: {
        id: orderItems[0].menuItemId,
      },
    });

    if (!firstMenuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          restaurantId: firstMenuItem.restaurantId,
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
}
