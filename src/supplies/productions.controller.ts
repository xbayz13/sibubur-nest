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
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductionsService } from './productions.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
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
    const rawUserId = req.user?.id ?? req.user?.sub;
    if (!rawUserId) {
      throw new UnauthorizedException('User authentication required. Please login again.');
    }

    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId);
    if (!userId || Number.isNaN(userId) || userId <= 0) {
      throw new BadRequestException('Invalid user ID. Please login again.');
    }

    return this.productionsService.create(createProductionDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all production records (paginated)' })
  findAll(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.productionsService.findAll(
      storeId ? +storeId : undefined,
      date,
      pagination?.page,
      pagination?.limit,
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

