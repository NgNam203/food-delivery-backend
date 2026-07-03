import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'customer@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  password!: string;
}
