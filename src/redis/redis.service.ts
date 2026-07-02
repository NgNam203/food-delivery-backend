import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisKeys } from './redis-keys';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: this.configService.getOrThrow<number>('REDIS_PORT'),
    });
  }

  getClient() {
    return this.redis;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, serializedValue, 'EX', ttlSeconds);
      return;
    }

    await this.redis.set(key, serializedValue);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return;
    }

    await this.redis.del(...keys);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async invalidateOwnerDashboard(ownerId: string) {
    await this.delete(RedisKeys.ownerDashboard(ownerId));
  }
}
