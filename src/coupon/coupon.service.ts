import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateCouponDto) {
    const code = dto.code.toUpperCase();
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: {
        code,
      },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    return this.prisma.coupon.create({
      data: {
        ownerId,
        code,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minimumOrder: dto.minimumOrder,
        maximumDiscount: dto.maximumDiscount,
        usageLimit: dto.usageLimit,
        isActive: dto.isActive ?? true,
        expiredAt: new Date(dto.expiredAt),
      },
    });
  }

  async findMyCoupons(ownerId: string) {
    return this.prisma.coupon.findMany({
      where: {
        ownerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(couponId: string, ownerId: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        ownerId,
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.coupon.update({
      where: {
        id: coupon.id,
      },
      data: {
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minimumOrder: dto.minimumOrder,
        maximumDiscount: dto.maximumDiscount,
        usageLimit: dto.usageLimit,
        isActive: dto.isActive,
        expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : undefined,
      },
    });
  }

  async toggleActive(couponId: string, ownerId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        ownerId,
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.coupon.update({
      where: {
        id: coupon.id,
      },
      data: {
        isActive: !coupon.isActive,
      },
    });
  }
}
