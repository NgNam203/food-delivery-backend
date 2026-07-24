import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Menu item ID',
    example: 'd1d3d5a8-2b66-4a86-9f17-c7cb68dd67e1',
  })
  @IsUUID()
  menuItemId!: string;

  @ApiProperty({
    description: 'Quantity of the menu item',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
