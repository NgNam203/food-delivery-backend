import {
  Body,
  Controller,
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
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CouponService } from './coupon.service';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @ApiOperation({
    summary: 'Create a coupon',
    description: 'Create a new coupon for the authenticated owner.',
  })
  @ApiCreatedResponse({
    description: 'Coupon created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiConflictResponse({
    description: 'Coupon code already exists.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCouponDto) {
    return this.couponService.create(user.userId, dto);
  }

  @ApiOperation({
    summary: 'Get my coupons',
    description: 'Retrieve all coupons created by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Coupons retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get()
  findMyCoupons(@CurrentUser() user: JwtPayload) {
    return this.couponService.findMyCoupons(user.userId);
  }

  @ApiOperation({
    summary: 'Update a coupon',
    description: 'Update coupon information owned by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Coupon updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Coupon not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  update(
    @Param('id') couponId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponService.update(couponId, user.userId, dto);
  }

  @ApiOperation({
    summary: 'Toggle coupon active status',
    description: 'Enable or disable a coupon owned by the authenticated owner.',
  })
  @ApiOkResponse({
    description: 'Coupon status updated successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid.',
  })
  @ApiNotFoundResponse({
    description: 'Coupon not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id/toggle-active')
  toggleActive(@Param('id') couponId: string, @CurrentUser() user: JwtPayload) {
    return this.couponService.toggleActive(couponId, user.userId);
  }
}
