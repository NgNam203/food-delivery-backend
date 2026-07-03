import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'Menu item name',
    example: 'Cheese Burger',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    description: 'Menu item description',
    example: 'Juicy beef burger with cheddar cheese',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Menu item price',
    example: 8.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    description: 'Available stock quantity',
    example: 50,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({
    description: 'Image URL of the menu item',
    example: 'https://example.com/images/burger.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the menu item is available',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
