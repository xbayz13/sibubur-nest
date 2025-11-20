import { IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddProductAddonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  addonId: number;

  @ApiProperty({ example: 2000, required: false, description: 'Override price for this addon when used with this product' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  addonPriceOverride?: number;
}

