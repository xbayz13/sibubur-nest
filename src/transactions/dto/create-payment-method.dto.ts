import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'Cash' })
  @IsString()
  @IsNotEmpty()
  name: string;
}


