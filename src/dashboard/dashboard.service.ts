import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardCacheService } from '../cache/dashboard-cache/dashboard-cache.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardCacheService: DashboardCacheService,
  ) {}
  async getOwnerDashboard(ownerId: string) {
    const cachedDashboard = await this.dashboardCacheService.get(ownerId);

    if (cachedDashboard) {
      console.log('Dashboard Cache HIT');
      return cachedDashboard;
    }

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    console.log('Dashboard Cache MISS');
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
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      paidOrders,
      pendingPayments,
      failedPayments,
      revenueToday,
      revenueThisMonth,
      topSellingMenuItems,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          restaurantId: {
            in: restaurantIds,
          },
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

      this.prisma.payment.count({
        where: {
          order: {
            restaurantId: {
              in: restaurantIds,
            },
          },
          status: PaymentStatus.PAID,
        },
      }),

      this.prisma.payment.count({
        where: {
          order: {
            restaurantId: {
              in: restaurantIds,
            },
          },
          status: PaymentStatus.PENDING,
        },
      }),

      this.prisma.payment.count({
        where: {
          order: {
            restaurantId: {
              in: restaurantIds,
            },
          },
          status: PaymentStatus.FAILED,
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

    const paymentMethodStats = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        order: {
          restaurantId: {
            in: restaurantIds,
          },
        },
        status: PaymentStatus.PAID,
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const paymentMethods = Object.values(PaymentMethod).map((method) => {
      const stat = paymentMethodStats.find((item) => item.method === method);

      return {
        method,
        count: stat?._count.id ?? 0,
        revenue: Number(stat?._sum.amount ?? 0),
      };
    });

    const dashboard = {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      paidOrders,
      pendingPayments,
      failedPayments,
      revenueToday,
      revenueThisMonth,
      topSellingMenuItems,
      paymentMethods,
    };

    await this.dashboardCacheService.set(ownerId, dashboard);

    return dashboard;
  }
}
