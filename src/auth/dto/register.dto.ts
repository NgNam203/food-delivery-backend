import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Customer email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Password must contain at least 6 characters',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
