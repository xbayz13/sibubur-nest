import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  productCategoryId?: number;

  @ApiProperty({ example: 'Bubur Ayam' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Bubur ayam dengan suwiran ayam', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  pictureId?: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  price: number;
}


