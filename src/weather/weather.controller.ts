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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { BMKGService } from './bmkg.service';
import { CreateWeatherDto } from './dto/create-weather.dto';
import { UpdateWeatherDto } from './dto/update-weather.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly bmkgService: BMKGService,
  ) {}

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

  @Get('bmkg/forecast')
  @Public() // No authentication required
  @ApiOperation({ 
    summary: 'Get weather forecast from BMKG API',
    description: 'Mengambil prakiraan cuaca dari API BMKG berdasarkan kode wilayah adm4. Contoh: 31.71.03.1001 untuk Kemayoran, Jakarta Pusat. Untuk Ponorogo, Jawa Timur (Desa Nologaten), gunakan kode: 35.02.17.1015'
  })
  @ApiQuery({ 
    name: 'adm4', 
    required: true,
    description: 'Kode wilayah administrasi tingkat IV (adm4). Format: provinsi.kabupaten.kecamatan.desa. Contoh: 31.71.03.1001 (Kemayoran) atau 35.02.17.1015 (Nologaten, Ponorogo)',
    example: '35.02.17.1015'
  })
  @ApiQuery({ 
    name: 'transform', 
    required: false,
    description: 'Jika true, mengembalikan data yang sudah ditransformasi. Default: false',
    type: Boolean,
    example: false
  })
  async getBMKGForecast(
    @Query('adm4') adm4: string,
    @Query('transform') transform?: string,
  ) {
    const data = await this.bmkgService.getWeatherForecast(adm4);
    
    if (transform === 'true') {
      return this.bmkgService.transformBMKGData(data);
    }
    
    return data;
  }
}


