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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantService } from './restaurant.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
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

@ApiTags('Restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @ApiOperation({
    summary: 'Create a restaurant',
    description: 'Create a new restaurant owned by the authenticated owner.',
  })
  @ApiCreatedResponse({
    description: 'Restaurant created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRestaurantDto) {
    return this.restaurantService.create(user.userId, dto);
  }

  @ApiOperation({
    summary: 'Get my restaurants',
    description: 'Retrieve all restaurants owned by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Restaurants retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('me')
  findMyRestaurants(@CurrentUser() user: JwtPayload) {
    return this.restaurantService.findMyRestaurants(user.userId);
  }

  @ApiOperation({
    summary: 'Update a restaurant',
    description:
      'Update information of a restaurant owned by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Restaurant updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to update this restaurant.',
  })
  @ApiNotFoundResponse({
    description: 'Restaurant not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') restaurantId: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(restaurantId, user.userId, dto);
  }

  @ApiOperation({
    summary: 'Delete a restaurant',
    description: 'Soft delete a restaurant owned by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Restaurant deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'You are not allowed to delete this restaurant.',
  })
  @ApiNotFoundResponse({
    description: 'Restaurant not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') restaurantId: string) {
    return this.restaurantService.remove(restaurantId, user.userId);
  }
}
