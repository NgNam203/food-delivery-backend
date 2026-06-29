import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async getOwnerDashboard(ownerId: string) {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const restaurantIds = restaurants.map((restaurant) => restaurant.id);

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      todayRevenue,
      monthRevenue,
      topSellingItems,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
        },
      }),

      this.prisma.order.count({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
          status: OrderStatus.PENDING,
        },
      }),

      this.prisma.order.count({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
          status: OrderStatus.COMPLETED,
        },
      }),

      this.prisma.order.count({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
          status: OrderStatus.CANCELLED,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
          status: OrderStatus.COMPLETED,
        },
        _sum: {
          totalAmount: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: startOfToday,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      this.prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: {
          order: {
            restaurantId: {
              in: restaurantIds,
            },
            status: OrderStatus.COMPLETED,
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      todayRevenue,
      monthRevenue,
      topSellingItems,
    };
  }
}
