import {
  IsDateString,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ProductionSupplyDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  supplyId: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateProductionDto {
  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  weatherId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  storeId: number;

  @ApiProperty({ type: [ProductionSupplyDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionSupplyDto)
  supplies?: ProductionSupplyDto[];
}


