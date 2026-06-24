import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { JwtPayload } from 'src/auth/types/jwt-payload.type';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuItemService } from './menu-item.service';

@Controller()
export class MenuItemController {
  constructor(private menuItemService: MenuItemService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('/restaurants/:restaurantId/menu-items')
  create(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuItemService.create(restaurantId, user.userId, dto);
  }

  @Get('/restaurants/:restaurantId/menu-items')
  findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuItemService.findByRestaurant(restaurantId);
  }
}
