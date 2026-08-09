import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('transactions.read')
@ApiBearerAuth()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req: any,
  ) {
    if (!req.user) {
      throw new UnauthorizedException(
        'User authentication required. Please login again.',
      );
    }

    // Extract user ID - should be set by JWT Guard
    let userId: number | undefined = undefined;

    // Try multiple ways to get the user ID (in order of preference)
    if (req.user?.id) {
      userId =
        typeof req.user.id === 'string'
          ? parseInt(req.user.id, 10)
          : Number(req.user.id);
    } else if (req.user?.sub) {
      userId =
        typeof req.user.sub === 'string'
          ? parseInt(req.user.sub, 10)
          : Number(req.user.sub);
    } else if (req.user?.userId) {
      userId =
        typeof req.user.userId === 'string'
          ? parseInt(req.user.userId, 10)
          : Number(req.user.userId);
    }

    // Validate userId
    if (
      userId === undefined ||
      userId === null ||
      isNaN(userId) ||
      userId <= 0
    ) {
      throw new BadRequestException(
        `Invalid user ID: ${userId}. User authentication required.`,
      );
    }

    const numericUserId = Number(userId);
    return this.transactionsService.create(createTransactionDto, numericUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions (paginated)' })
  findAll(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.transactionsService.findAll(
      storeId ? +storeId : undefined,
      date,
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(+id);
  }
}
