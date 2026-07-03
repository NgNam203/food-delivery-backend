import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCouponDto {
  @ApiPropertyOptional({
    description: 'Coupon description',
    example: 'Updated welcome discount',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Coupon discount type',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({
    description: 'Discount value',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiProperty({
    description: 'Minimum order amount required',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrder?: number;

  @ApiPropertyOptional({
    description: 'Maximum discount amount',
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumDiscount?: number;

  @ApiProperty({
    description: 'Maximum number of coupon usages',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({
    description: 'Whether the coupon is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Coupon expiration date',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiredAt?: string;
}
