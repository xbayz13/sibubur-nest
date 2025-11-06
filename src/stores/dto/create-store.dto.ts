import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: 'Store Cabang Pusat' })
  @IsString()
  @IsNotEmpty()
  name: string;
}


