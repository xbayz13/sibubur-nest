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
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('orders.read')
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: { user?: { id?: number; sub?: number } },
  ) {
    if (!req.user) {
      throw new UnauthorizedException(
        'User authentication required. Please login again.',
      );
    }

    const userId =
      req.user.id != null
        ? Number(req.user.id)
        : req.user.sub != null
          ? Number(req.user.sub)
          : undefined;

    if (userId === undefined || isNaN(userId) || userId <= 0) {
      throw new BadRequestException(
        'Invalid user ID. User authentication required. Please login again.',
      );
    }

    return this.ordersService.create(createOrderDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (paginated)' })
  findAll(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.ordersService.findAll(
      storeId ? +storeId : undefined,
      date,
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get an order by order number' })
  findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
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
