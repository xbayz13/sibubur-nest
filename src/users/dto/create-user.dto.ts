import { IsString, IsNotEmpty, IsInt, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  roleId: number;

  @ApiProperty({ example: 1, required: false, description: 'Store ID for cashier users (1-to-1 relationship)' })
  @IsInt()
  @IsOptional()
  storeId?: number | null;
}

