import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Query DTO for GET /transactions.
 * Extends PaginationQueryDto so storeId/date are whitelisted
 * (global ValidationPipe uses forbidNonWhitelisted: true).
 */
export class TransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter by store ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  storeId?: number;

  @ApiPropertyOptional({
    example: '2026-06-17',
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
