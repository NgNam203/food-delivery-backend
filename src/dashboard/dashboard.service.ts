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

    const totalOrders = await this.prisma.order.count({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
      },
    });

    const pendingOrders = await this.prisma.order.count({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
        status: OrderStatus.PENDING,
      },
    });

    const completedOrders = await this.prisma.order.count({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
        status: OrderStatus.COMPLETED,
      },
    });

    const cancelledOrders = await this.prisma.order.count({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
        status: OrderStatus.CANCELLED,
      },
    });

    const revenue = await this.prisma.order.aggregate({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
        status: OrderStatus.COMPLETED,
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = Number(revenue._sum.totalAmount ?? 0);

    const todayRevenue = await this.prisma.order.aggregate({
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
    });

    const revenueToday = Number(todayRevenue._sum.totalAmount ?? 0);

    const monthRevenue = await this.prisma.order.aggregate({
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
    });

    const revenueThisMonth = Number(monthRevenue._sum.totalAmount ?? 0);

    const topSellingItems = await this.prisma.orderItem.groupBy({
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
    });

    const menuItemIds = topSellingItems.map((item) => item.menuItemId);

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: {
          in: menuItemIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const topSellingMenuItems = topSellingItems.map((item) => {
      const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);

      return {
        id: menuItem?.id,
        name: menuItem?.name,
        price: Number(menuItem?.price),
        soldQuantity: item._sum.quantity ?? 0,
      };
    });

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      revenueToday,
      revenueThisMonth,
      topSellingMenuItems,
    };
  }
}
