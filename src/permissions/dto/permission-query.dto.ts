import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Query DTO for GET /permissions.
 * Extends PaginationQueryDto so module is whitelisted
 * (global ValidationPipe uses forbidNonWhitelisted: true).
 */
export class PermissionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'orders',
    description: 'Filter by permission module',
  })
  @IsOptional()
  @IsString()
  module?: string;
}
