import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemData } from './types/order-item-data.type';
import { OrderStatus, UserRole } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

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
        },
        include: {
          restaurant: true,
        },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      if (!menuItem.isAvailable) {
        throw new BadRequestException(`${menuItem.name} is unavailable`);
      }

      if (menuItem.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${menuItem.name}`,
        );
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

      for (const item of orderItems) {
        const updated = await tx.menuItem.updateMany({
          where: {
            id: item.menuItemId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException(
            `Insufficient stock for ${item.menuItemNameSnapshot}`,
          );
        }
      }

      return order;
    });
  }

  async findMyOrders(customerId: string, pagination: PaginationQueryDto) {
    const { page, limit } = pagination;

    const skip = (page - 1) * limit;

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
      skip,
      take: limit,
    });
  }

  async findRestaurantOrders(
    restaurantId: string,
    ownerId: string,
    pagination: PaginationQueryDto,
  ) {
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
    const { page, limit } = pagination;

    const skip = (page - 1) * limit;
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
      skip,
      take: limit,
    });
  }

  private readonly allowedStatusTransitions: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    CONFIRMED: [OrderStatus.PREPARING],
    PREPARING: [OrderStatus.DELIVERING],
    DELIVERING: [OrderStatus.COMPLETED],
    COMPLETED: [],
    CANCELLED: [],
  };

  async updateStatus(
    orderId: string,
    ownerId: string,
    nextStatus: OrderStatus,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
      },
      include: {
        restaurant: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.restaurant.ownerId !== ownerId) {
      throw new ForbiddenException('You are not allowed to update this order');
    }

    const allowedNextStatuses = this.allowedStatusTransitions[order.status];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot change order status from ${order.status} to ${nextStatus}`,
      );
    }

    return this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: nextStatus,
      },
    });
  }

  async findDetail(orderId: string, userId: string, role: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        restaurant: true,
        customer: {
          select: {
            id: true,
            email: true,
          },
        },
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (role === UserRole.OWNER && order.restaurant.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }
}
