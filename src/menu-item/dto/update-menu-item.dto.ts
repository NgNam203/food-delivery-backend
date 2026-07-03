import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({
    description: 'Menu item name',
    example: 'Double Cheese Burger',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    description: 'Menu item description',
    example: 'Double beef burger with cheddar cheese',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Menu item price',
    example: 10.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Available stock quantity',
    example: 80,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    description: 'Image URL of the menu item',
    example: 'https://example.com/images/double-burger.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the menu item is available',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
