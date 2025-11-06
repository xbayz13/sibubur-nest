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
import { WeatherService } from './weather.service';
import { CreateWeatherDto } from './dto/create-weather.dto';
import { UpdateWeatherDto } from './dto/update-weather.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new weather record' })
  create(@Body() createWeatherDto: CreateWeatherDto) {
    return this.weatherService.create(createWeatherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all weather records' })
  findAll() {
    return this.weatherService.findAll();
  }

  @Get('date/:date')
  @ApiOperation({ summary: 'Get weather by date' })
  findByDate(@Param('date') date: string) {
    return this.weatherService.findByDate(date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a weather record by ID' })
  findOne(@Param('id') id: string) {
    return this.weatherService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a weather record' })
  update(@Param('id') id: string, @Body() updateWeatherDto: UpdateWeatherDto) {
    return this.weatherService.update(+id, updateWeatherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a weather record' })
  remove(@Param('id') id: string) {
    return this.weatherService.remove(+id);
  }
}


