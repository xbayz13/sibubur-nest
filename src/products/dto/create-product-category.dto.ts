import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ example: 'Bubur' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Kategori untuk berbagai jenis bubur', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}


