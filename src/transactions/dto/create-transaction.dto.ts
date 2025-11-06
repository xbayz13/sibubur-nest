import { IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  paymentMethodId: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  storeId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  orderId: number;
}


