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

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCouponDto) {
    return this.couponService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get()
  findMyCoupons(@CurrentUser() user: JwtPayload) {
    return this.couponService.findMyCoupons(user.userId);
  }

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id/toggle-active')
  toggleActive(@Param('id') couponId: string, @CurrentUser() user: JwtPayload) {
    return this.couponService.toggleActive(couponId, user.userId);
  }
}
