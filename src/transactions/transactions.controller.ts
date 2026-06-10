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
import { SuperAdminGuard } from '../common/guards/superadmin.guard';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  async create(@Body() createTransactionDto: CreateTransactionDto, @Request() req: any) {
    this.logger.log(`[TransactionsController] Request received`);
    this.logger.log(`[TransactionsController] req.user: ${JSON.stringify(req.user)}`);
    
    if (!req.user) {
      this.logger.error('[TransactionsController] req.user is undefined');
      throw new UnauthorizedException('User authentication required. Please login again.');
    }

    // Extract user ID - should be set by JWT Guard
    let userId: number | undefined = undefined;
    
    // Try multiple ways to get the user ID (in order of preference)
    if (req.user?.id) {
      userId = typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : Number(req.user.id);
    } else if (req.user?.sub) {
      userId = typeof req.user.sub === 'string' ? parseInt(req.user.sub, 10) : Number(req.user.sub);
    } else if ((req.user as any)?.userId) {
      userId = typeof (req.user as any).userId === 'string' 
        ? parseInt((req.user as any).userId, 10) 
        : Number((req.user as any).userId);
    }
    
    this.logger.log(`[TransactionsController] Extracted userId: ${userId}`);
    
    // Validate userId
    if (userId === undefined || userId === null || isNaN(userId) || userId <= 0) {
      this.logger.error(`[TransactionsController] Invalid user ID. req.user: ${JSON.stringify(req.user)}`);
      throw new BadRequestException(`Invalid user ID: ${userId}. User authentication required.`);
    }
    
    // Ensure it's a number
    const numericUserId = Number(userId);
    this.logger.log(`[TransactionsController] Processing transaction with userId: ${numericUserId}`);
    
    try {
      const result = await this.transactionsService.create(createTransactionDto, numericUserId);
      this.logger.log(`[TransactionsController] Transaction created successfully: ${result.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[TransactionsController] Error creating transaction: ${error.message}`);
      throw error;
    }
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

