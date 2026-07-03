import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({
    description: 'List of menu items to order',
    type: [CreateOrderItemDto],
    example: [
      {
        menuItemId: 'd1d3d5a8-2b66-4a86-9f17-c7cb68dd67e1',
        quantity: 2,
      },
      {
        menuItemId: '9fc11df2-c08c-4560-a5e5-695f99f31b5c',
        quantity: 1,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
