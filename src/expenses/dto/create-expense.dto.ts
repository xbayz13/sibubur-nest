import { IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  expenseCategoryId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  storeId: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;
}


