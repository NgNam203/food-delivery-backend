import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, ownerId: string, dto: CreateMenuItemDto) {
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
        'You are not allowed to modify this restaurant',
      );
    }

    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async findByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(menuItemId: string, ownerId: string, dto: UpdateMenuItemDto) {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        deletedAt: null,
      },
      include: {
        restaurant: true,
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    if (menuItem.restaurant.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You are not allowed to modify this menu item',
      );
    }

    return this.prisma.menuItem.update({
      where: {
        id: menuItemId,
      },
      data: dto,
    });
  }
}
