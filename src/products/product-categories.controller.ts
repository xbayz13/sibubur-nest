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
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('product-categories')
@Controller('product-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductCategoriesController {
  constructor(
    private readonly categoriesService: ProductCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product category' })
  create(@Body() createCategoryDto: CreateProductCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all product categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product category' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product category (soft delete)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}


