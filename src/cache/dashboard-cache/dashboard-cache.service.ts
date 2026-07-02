import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { RedisKeys } from '../../redis/redis-keys';
import { RedisTTL } from '../../redis/redis.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardCacheService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async get<T>(ownerId: string): Promise<T | null> {
    return this.redisService.get<T>(RedisKeys.ownerDashboard(ownerId));
  }

  async set(ownerId: string, dashboard: unknown): Promise<void> {
    await this.redisService.set(
      RedisKeys.ownerDashboard(ownerId),
      dashboard,
      RedisTTL.DASHBOARD,
    );
  }

  async invalidate(ownerId: string): Promise<void> {
    await this.redisService.delete(RedisKeys.ownerDashboard(ownerId));
  }

  async invalidateByRestaurantId(restaurantId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
      select: {
        ownerId: true,
      },
    });

    if (!restaurant) {
      return;
    }

    await this.invalidate(restaurant.ownerId);
  }
}
