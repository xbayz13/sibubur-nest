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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('payment-methods')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment method' })
  create(@Body() createPaymentMethodDto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(createPaymentMethodDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment methods (paginated)' })
  findAll(@Query() pagination?: PaginationQueryDto) {
    return this.paymentMethodsService.findAll(pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment method by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment method' })
  update(@Param('id') id: string, @Body() updatePaymentMethodDto: UpdatePaymentMethodDto) {
    return this.paymentMethodsService.update(+id, updatePaymentMethodDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment method (soft delete)' })
  remove(@Param('id') id: string) {
    return this.paymentMethodsService.remove(+id);
  }
}


