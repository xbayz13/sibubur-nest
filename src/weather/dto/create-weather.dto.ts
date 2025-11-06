import { IsDateString, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWeatherDto {
  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Jakarta', required: false })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({ example: 'JKT', required: false })
  @IsOptional()
  @IsString()
  locationCode?: string;

  @ApiProperty({ example: { temperature: 30, condition: 'sunny' }, required: false })
  @IsOptional()
  @IsObject()
  weatherJson?: Record<string, any>;
}


