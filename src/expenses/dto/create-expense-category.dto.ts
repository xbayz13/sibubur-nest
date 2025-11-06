import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Bahan Baku' })
  @IsString()
  @IsNotEmpty()
  name: string;
}


