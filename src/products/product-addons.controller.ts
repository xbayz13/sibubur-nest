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
import { ProductAddonsService } from './product-addons.service';
import { CreateProductAddonDto } from './dto/create-product-addon.dto';
import { UpdateProductAddonDto } from './dto/update-product-addon.dto';
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
  @ApiOperation({ summary: 'Get all product addons' })
  findAll() {
    return this.addonsService.findAll();
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


