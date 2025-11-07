import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: any,
  ) {
    // Log the entire request user object for debugging
    this.logger.log(`[OrdersController] Request received`);
    this.logger.log(`[OrdersController] req.user: ${JSON.stringify(req.user)}`);
    this.logger.log(`[OrdersController] req.user type: ${typeof req.user}`);
    this.logger.log(`[OrdersController] req.user keys: ${req.user ? Object.keys(req.user).join(', ') : 'null'}`);
    this.logger.log(`[OrdersController] Full request object keys: ${Object.keys(req).join(', ')}`);
    
    if (!req.user) {
      this.logger.error('[OrdersController] req.user is undefined - authentication may have failed');
      throw new BadRequestException('User authentication required. Please login again.');
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
    
    this.logger.log(`[OrdersController] Extracted userId: ${userId} (type: ${typeof userId})`);
    
    // Validate userId
    if (userId === undefined || userId === null || isNaN(userId) || userId <= 0) {
      this.logger.error(`[OrdersController] Invalid user ID. req.user structure: ${JSON.stringify(req.user)}`);
      this.logger.error(`[OrdersController] userId value: ${userId}, type: ${typeof userId}`);
      throw new BadRequestException(`Invalid user ID: ${userId}. User authentication required. Please login again.`);
    }
    
    // Ensure it's a number
    const numericUserId = Number(userId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      this.logger.error(`[OrdersController] Invalid numeric user ID: ${numericUserId}`);
      throw new BadRequestException(`Invalid user ID format: ${userId}`);
    }
    
    this.logger.log(`[OrdersController] Final numericUserId: ${numericUserId}`);
    this.logger.log(`[OrdersController] Creating order with userId: ${numericUserId}`);
    this.logger.log(`[OrdersController] Order DTO: ${JSON.stringify(createOrderDto)}`);
    
    // Final validation before calling service
    if (!numericUserId || numericUserId <= 0 || isNaN(numericUserId)) {
      this.logger.error(`[OrdersController] Invalid numericUserId before service call: ${numericUserId}`);
      throw new BadRequestException(`Invalid user ID: ${numericUserId}. Please login again.`);
    }
    
    try {
      const result = await this.ordersService.create(createOrderDto, numericUserId);
      this.logger.log(`[OrdersController] Order creation completed successfully with ID: ${result.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[OrdersController] Error creating order: ${error.message}`);
      this.logger.error(`[OrdersController] Error stack: ${error.stack}`);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  findAll(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
  ) {
    this.logger.log(`[OrdersController] findAll called with storeId: ${storeId}, date: ${date}`);
    const result = this.ordersService.findAll(
      storeId ? +storeId : undefined,
      date,
    );
    this.logger.log(`[OrdersController] findAll returning result`);
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get an order by order number' })
  findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(+id);
  }

  @Patch(':id/paid')
  @ApiOperation({ summary: 'Mark an order as paid' })
  markAsPaid(@Param('id') id: string) {
    return this.ordersService.markAsPaid(+id);
  }
}


