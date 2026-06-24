import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuItemService } from './menu-item.service';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch('/menu-items/:id')
  update(
    @Param('id') menuItemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuItemService.update(menuItemId, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete('/menu-items/:id')
  remove(@Param('id') menuItemId: string, @CurrentUser() user: JwtPayload) {
    return this.menuItemService.remove(menuItemId, user.userId);
  }
}
