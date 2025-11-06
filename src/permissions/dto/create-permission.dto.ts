import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'products' })
  @IsString()
  @IsNotEmpty()
  module: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ example: 'products.create' })
  @IsString()
  @IsNotEmpty()
  slug: string;
}


