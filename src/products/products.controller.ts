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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddProductAddonDto } from './dto/add-product-addon.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('products.read')
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (paginated)' })
  findAll(@Query() pagination?: PaginationQueryDto) {
    return this.productsService.findAll(pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product (soft delete)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }

  @Post(':id/addons')
  @ApiOperation({ summary: 'Add an addon to a product' })
  addAddon(
    @Param('id') id: string,
    @Body() addProductAddonDto: AddProductAddonDto,
  ) {
    return this.productsService.addAddon(+id, addProductAddonDto);
  }

  @Delete(':id/addons/:addonId')
  @ApiOperation({ summary: 'Remove an addon from a product' })
  removeAddon(@Param('id') id: string, @Param('addonId') addonId: string) {
    return this.productsService.removeAddon(+id, +addonId);
  }
}
