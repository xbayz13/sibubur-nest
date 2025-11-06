import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductAddonDto {
  @ApiProperty({ example: 'Kerupuk' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}


