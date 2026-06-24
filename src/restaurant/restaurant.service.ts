import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data: {
        ownerId,
        name: dto.name,
        address: dto.address,
        description: dto.description,
      },
    });
  }

  async findMyRestaurants(ownerId: string) {
    return this.prisma.restaurant.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
    });
  }

  async update(
    restaurantId: string,
    ownerId: string,
    dto: UpdateRestaurantDto,
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
        'You are not allowed to update this restaurant',
      );
    }

    return this.prisma.restaurant.update({
      where: {
        id: restaurantId,
      },
      data: dto,
    });
  }

  async remove(restaurantId: string, ownerId: string) {
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
        'You are not allowed to delete this restaurant',
      );
    }

    return this.prisma.restaurant.update({
      where: {
        id: restaurantId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
