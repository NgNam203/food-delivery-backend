import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { DiscountType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Unique coupon code',
    example: 'WELCOME10',
  })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiPropertyOptional({
    description: 'Coupon description',
    example: '15% discount for new customers',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Coupon discount type',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({
    description: 'Discount value',
    example: 15,
  })
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @ApiProperty({
    description: 'Minimum order amount required',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  minimumOrder!: number;

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
  @IsInt()
  @Min(1)
  usageLimit!: number;

  @ApiPropertyOptional({
    description: 'Whether the coupon is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Coupon expiration date',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsDateString()
  expiredAt!: string;
}
