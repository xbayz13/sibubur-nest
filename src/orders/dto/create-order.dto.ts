import {
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OrderItemAddonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  addonId: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

class OrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ type: [OrderItemAddonDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemAddonDto)
  addons?: OrderItemAddonDto[];
}

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  storeId: number;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}


