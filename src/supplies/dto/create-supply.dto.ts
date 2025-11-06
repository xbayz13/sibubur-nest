import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplyDto {
  @ApiProperty({ example: 'Beras' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  minStock: number;
}


