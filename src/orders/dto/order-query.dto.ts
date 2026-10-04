import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrderStatus } from '../../entities/order.entity';

/**
 * Query DTO for GET /orders.
 * Extends PaginationQueryDto so storeId/date/status are whitelisted
 * (global ValidationPipe uses forbidNonWhitelisted: true).
 */
export class OrderQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter by order status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
