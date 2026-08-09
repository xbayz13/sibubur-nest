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
import { SuppliesService } from './supplies.service';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('supplies')
@Controller('supplies')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('supplies.read')
@ApiBearerAuth()
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new supply' })
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all supplies (paginated)' })
  findAll(@Query() pagination?: PaginationQueryDto) {
    return this.suppliesService.findAll(pagination?.page, pagination?.limit);
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

  @Patch(':id/restock')
  @ApiOperation({
    summary: 'Restock a supply (add quantity to existing stock)',
  })
  restock(@Param('id') id: string, @Body() body: { quantity: number }) {
    return this.suppliesService.restock(+id, body.quantity);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supply (soft delete)' })
  remove(@Param('id') id: string) {
    return this.suppliesService.remove(+id);
  }
}
