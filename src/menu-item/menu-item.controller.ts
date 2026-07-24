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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Menu Items')
@ApiBearerAuth()
@Controller()
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @ApiOperation({
    summary: 'Create a menu item',
    description:
      'Create a new menu item for a restaurant owned by the authenticated owner.',
  })
  @ApiCreatedResponse({
    description: 'Menu item created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to manage this restaurant.',
  })
  @ApiNotFoundResponse({
    description: 'Restaurant not found.',
  })
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

  @ApiOperation({
    summary: 'Get restaurant menu',
    description: 'Retrieve all available menu items of a restaurant.',
  })
  @ApiOkResponse({
    description: 'Menu items retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Restaurant not found.',
  })
  @Get('/restaurants/:restaurantId/menu-items')
  findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuItemService.findByRestaurant(restaurantId);
  }

  @ApiOperation({
    summary: 'Update a menu item',
    description:
      'Update an existing menu item owned by the authenticated restaurant owner.',
  })
  @ApiOkResponse({
    description: 'Menu item updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to update this menu item.',
  })
  @ApiNotFoundResponse({
    description: 'Menu item not found.',
  })
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

  @ApiOperation({
    summary: 'Delete a menu item',
    description:
      'Soft delete a menu item owned by the authenticated restaurant owner.',
  })
  @ApiOkResponse({
    description: 'Menu item deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to delete this menu item.',
  })
  @ApiNotFoundResponse({
    description: 'Menu item not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete('/menu-items/:id')
  remove(@Param('id') menuItemId: string, @CurrentUser() user: JwtPayload) {
    return this.menuItemService.remove(menuItemId, user.userId);
  }
}
