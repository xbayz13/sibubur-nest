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
    return this.productionsService.create(createProductionDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all production records' })
  findAll(@Query('storeId') storeId?: string) {
    return this.productionsService.findAll(storeId ? +storeId : undefined);
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


