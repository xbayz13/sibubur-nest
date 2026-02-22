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
import { ProductAddonsService } from './product-addons.service';
import { CreateProductAddonDto } from './dto/create-product-addon.dto';
import { UpdateProductAddonDto } from './dto/update-product-addon.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('product-addons')
@Controller('product-addons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductAddonsController {
  constructor(private readonly addonsService: ProductAddonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product addon' })
  create(@Body() createAddonDto: CreateProductAddonDto) {
    return this.addonsService.create(createAddonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all product addons (paginated)' })
  findAll(@Query() pagination?: PaginationQueryDto) {
    return this.addonsService.findAll(pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product addon by ID' })
  findOne(@Param('id') id: string) {
    return this.addonsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product addon' })
  update(@Param('id') id: string, @Body() updateAddonDto: UpdateProductAddonDto) {
    return this.addonsService.update(+id, updateAddonDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product addon (soft delete)' })
  remove(@Param('id') id: string) {
    return this.addonsService.remove(+id);
  }
}


