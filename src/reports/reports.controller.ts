import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isInteger(n)) return undefined;
  return n;
}

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('reports.read')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily/:date')
  @ApiOperation({ summary: 'Get daily report' })
  getDailyReport(
    @Param('date') date: string,
    @Query('storeId') storeId?: string,
  ) {
    const storeIdNum = parseOptionalInt(storeId);
    if (storeId !== undefined && storeId !== '' && storeIdNum === undefined) {
      throw new BadRequestException('storeId must be a valid integer');
    }
    return this.reportsService.getDailyReport(date, storeIdNum);
  }

  @Get('monthly/:year/:month')
  @ApiOperation({ summary: 'Get monthly report' })
  getMonthlyReport(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Query('storeId') storeId?: string,
  ) {
    const storeIdNum = parseOptionalInt(storeId);
    if (storeId !== undefined && storeId !== '' && storeIdNum === undefined) {
      throw new BadRequestException('storeId must be a valid integer');
    }
    return this.reportsService.getMonthlyReport(year, month, storeIdNum);
  }

  @Get('yearly/:year')
  @ApiOperation({ summary: 'Get yearly report' })
  getYearlyReport(
    @Param('year', ParseIntPipe) year: number,
    @Query('storeId') storeId?: string,
  ) {
    const storeIdNum = parseOptionalInt(storeId);
    if (storeId !== undefined && storeId !== '' && storeIdNum === undefined) {
      throw new BadRequestException('storeId must be a valid integer');
    }
    return this.reportsService.getYearlyReport(year, storeIdNum);
  }

  @Get('recommendations/:date')
  @ApiOperation({
    summary: 'Get production recommendations for a specific date',
  })
  getProductionRecommendations(
    @Param('date') date: string,
    @Query('storeId') storeId?: string,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const storeIdNum = parseOptionalInt(storeId);
    if (storeId !== undefined && storeId !== '' && storeIdNum === undefined) {
      throw new BadRequestException('storeId must be a valid integer');
    }
    const lookback =
      lookbackDays !== undefined && lookbackDays !== ''
        ? (parseOptionalInt(lookbackDays) ?? 30)
        : 30;
    if (lookback <= 0) {
      throw new BadRequestException('lookbackDays must be a positive integer');
    }
    return this.reportsService.getProductionRecommendations(
      date,
      storeIdNum,
      lookback,
    );
  }
}
