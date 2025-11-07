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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductionsService } from './productions.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('productions')
@Controller('productions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new production record' })
  create(@Body() createProductionDto: CreateProductionDto, @Request() req) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.productionsService.create(createProductionDto, typeof userId === 'string' ? parseInt(userId, 10) : userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all production records' })
  findAll(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
  ) {
    return this.productionsService.findAll(
      storeId ? +storeId : undefined,
      date,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a production record by ID' })
  findOne(@Param('id') id: string) {
    return this.productionsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a production record' })
  update(@Param('id') id: string, @Body() updateProductionDto: UpdateProductionDto) {
    return this.productionsService.update(+id, updateProductionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a production record' })
  remove(@Param('id') id: string) {
    return this.productionsService.remove(+id);
  }
}


