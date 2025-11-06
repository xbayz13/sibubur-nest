import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliesService } from './supplies.service';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('supplies')
@Controller('supplies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new supply' })
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all supplies' })
  findAll() {
    return this.suppliesService.findAll();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get supplies with low stock' })
  getLowStock() {
    return this.suppliesService.getLowStockSupplies();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supply by ID' })
  findOne(@Param('id') id: string) {
    return this.suppliesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supply' })
  update(@Param('id') id: string, @Body() updateSupplyDto: UpdateSupplyDto) {
    return this.suppliesService.update(+id, updateSupplyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supply (soft delete)' })
  remove(@Param('id') id: string) {
    return this.suppliesService.remove(+id);
  }
}


