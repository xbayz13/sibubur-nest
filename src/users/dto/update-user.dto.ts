import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsInt, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'john_doe', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiProperty({ example: 1, required: false, description: 'Store ID for cashier users (1-to-1 relationship)' })
  @IsOptional()
  @IsInt()
  storeId?: number | null;
}

