import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query DTO for paginated list endpoints.
 * Default: page=1, limit=50. Max limit=100.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export function getPaginationParams(page?: number, limit?: number): { take: number; skip: number; page: number; limit: number } {
  const p = page != null && page >= 1 ? Math.floor(page) : DEFAULT_PAGE;
  const l = limit != null && limit >= 1 ? Math.min(Math.floor(limit), MAX_LIMIT) : DEFAULT_LIMIT;
  return {
    page: p,
    limit: l,
    take: l,
    skip: (p - 1) * l,
  };
}
