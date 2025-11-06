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
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('expense-categories')
@Controller('expense-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpenseCategoriesController {
  constructor(
    private readonly categoriesService: ExpenseCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new expense category' })
  create(@Body() createCategoryDto: CreateExpenseCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expense categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense category' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateExpenseCategoryDto,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense category (soft delete)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}


