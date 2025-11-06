import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily/:date')
  @ApiOperation({ summary: 'Get daily report' })
  getDailyReport(
    @Param('date') date: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportsService.getDailyReport(date, storeId ? +storeId : undefined);
  }

  @Get('monthly/:year/:month')
  @ApiOperation({ summary: 'Get monthly report' })
  getMonthlyReport(
    @Param('year') year: string,
    @Param('month') month: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportsService.getMonthlyReport(
      +year,
      +month,
      storeId ? +storeId : undefined,
    );
  }

  @Get('yearly/:year')
  @ApiOperation({ summary: 'Get yearly report' })
  getYearlyReport(
    @Param('year') year: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportsService.getYearlyReport(+year, storeId ? +storeId : undefined);
  }
}

