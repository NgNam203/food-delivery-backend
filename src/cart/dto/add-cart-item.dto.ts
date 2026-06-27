import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
