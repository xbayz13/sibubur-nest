import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

export interface BMKGWeatherData {
  lokasi: {
    adm1: string;
    adm2: string;
    adm3: string;
    adm4: string;
    provinsi: string;
    kotkab: string;
    kecamatan: string;
    desa: string;
    lon: number;
    lat: number;
    timezone: string;
  };
  data: Array<{
    lokasi: {
      adm1: string;
      adm2: string;
      adm3: string;
      adm4: string;
      provinsi: string;
      kotkab: string;
      kecamatan: string;
      desa: string;
      lon: number;
      lat: number;
      timezone: string;
      type: string;
    };
    cuaca: Array<Array<{
      datetime: string;
      t: number; // temperature
      tcc: number; // total cloud cover
      tp: number; // total precipitation
      weather: number; // weather code
      weather_desc: string; // weather description (Indonesian)
      weather_desc_en: string; // weather description (English)
      wd_deg: number; // wind direction degree
      wd: string; // wind direction
      wd_to: string; // wind direction to
      ws: number; // wind speed
      hu: number; // humidity
      vs: number; // visibility
      vs_text: string; // visibility text
      time_index: string;
      analysis_date: string;
      image: string;
      utc_datetime: string;
      local_datetime: string;
      source?: string;
    }>>;
  }>;
}

@Injectable()
export class BMKGService {
  private readonly BMKG_API_BASE_URL = 'https://api.bmkg.go.id/publik';

  /**
   * Fetch weather forecast from BMKG API
   * @param adm4Code - Kode wilayah administrasi tingkat IV (contoh: 31.71.03.1001 untuk Kemayoran)
   * @returns Weather forecast data from BMKG
   */
  async getWeatherForecast(adm4Code: string, localDatetime: string = new Date().toISOString()): Promise<BMKGWeatherData> {
    try {
      const response = await axios.get<BMKGWeatherData>(
        `${this.BMKG_API_BASE_URL}/prakiraan-cuaca`,
        {
          params: { adm4: adm4Code, local_datetime: localDatetime },
          timeout: 10000, // 10 seconds timeout
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message: string; error: string; statusCode: number }>;
        
        if (axiosError.response?.status === 404) {
          throw new HttpException(
            {
              message: `Data prakiraan cuaca tidak ditemukan untuk kode wilayah ${adm4Code}. Pastikan kode adm4 yang digunakan benar.`,
              error: 'Data not found',
              statusCode: 404,
            },
            HttpStatus.NOT_FOUND,
          );
        }

        if (axiosError.code === 'ECONNABORTED') {
          throw new HttpException(
            {
              message: 'Timeout saat mengambil data dari BMKG API',
              error: 'Request timeout',
              statusCode: 408,
            },
            HttpStatus.REQUEST_TIMEOUT,
          );
        }

        throw new HttpException(
          {
            message: `Gagal mengambil data dari BMKG API: ${axiosError.message}`,
            error: 'BMKG API Error',
            statusCode: axiosError.response?.status || 500,
          },
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        {
          message: 'Terjadi kesalahan saat mengambil data cuaca',
          error: 'Internal Server Error',
          statusCode: 500,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Transform BMKG weather data to a simplified format
   * @param bmkgData - Raw data from BMKG API
   * @returns Simplified weather data
   */
  transformBMKGData(bmkgData: BMKGWeatherData, options?: { includeRaw?: boolean }) {
    if (!bmkgData.data || bmkgData.data.length === 0) {
      return null;
    }

    const firstData = bmkgData.data[0];
    const todayForecast = firstData.cuaca[0] || [];
    const tomorrowForecast = firstData.cuaca[1] || [];
    const dayAfterForecast = firstData.cuaca[2] || [];

    // Get current/latest forecast
    const currentForecast = todayForecast[todayForecast.length - 1] || todayForecast[0];

    const deriveCondition = (forecastArray: any[], fallback?: string) => {
      if (forecastArray && forecastArray.length > 0) return forecastArray[0].weather_desc;
      return fallback || null;
    };

    const derivedCondition = deriveCondition(todayForecast, currentForecast?.weather_desc);
    const derivedDescription = deriveCondition(
      todayForecast,
      currentForecast?.weather_desc_en || currentForecast?.weather_desc,
    );

    const transformed = {
      location: {
        province: bmkgData.lokasi.provinsi,
        city: bmkgData.lokasi.kotkab,
        district: bmkgData.lokasi.kecamatan,
        village: bmkgData.lokasi.desa,
        code: bmkgData.lokasi.adm4,
        coordinates: {
          longitude: bmkgData.lokasi.lon,
          latitude: bmkgData.lokasi.lat,
        },
        timezone: bmkgData.lokasi.timezone,
      },
      current: currentForecast ? {
        temperature: currentForecast.t,
        condition: currentForecast.weather_desc,
        conditionEn: currentForecast.weather_desc_en,
        humidity: currentForecast.hu,
        windSpeed: currentForecast.ws,
        windDirection: currentForecast.wd,
        visibility: currentForecast.vs_text,
        precipitation: currentForecast.tp,
        cloudCover: currentForecast.tcc,
        datetime: currentForecast.local_datetime,
        image: currentForecast.image,
      } : null,
      forecasts: {
        today: todayForecast.map(f => ({
          temperature: f.t,
          condition: f.weather_desc,
          humidity: f.hu,
          windSpeed: f.ws,
          precipitation: f.tp,
          datetime: f.local_datetime,
          timeIndex: f.time_index,
        })),
        tomorrow: tomorrowForecast.map(f => ({
          temperature: f.t,
          condition: f.weather_desc,
          humidity: f.hu,
          windSpeed: f.ws,
          precipitation: f.tp,
          datetime: f.local_datetime,
          timeIndex: f.time_index,
        })),
        dayAfter: dayAfterForecast.map(f => ({
          temperature: f.t,
          condition: f.weather_desc,
          humidity: f.hu,
          windSpeed: f.ws,
          precipitation: f.tp,
          datetime: f.local_datetime,
          timeIndex: f.time_index,
        })),
      },
      condition: derivedCondition,
      description: derivedDescription,
    };

    if (options?.includeRaw) {
      return { ...transformed, raw: bmkgData };
    }

    return transformed;
  }

  transformBMKGDataForDay(
    bmkgData: BMKGWeatherData,
    dayIndex: 0 | 1 | 2,
    options?: { includeRaw?: boolean },
  ) {
    if (!bmkgData.data || bmkgData.data.length === 0) {
      return null;
    }

    const firstData = bmkgData.data[0];
    const dayForecast = firstData.cuaca[dayIndex] || [];

    const condition = dayForecast[0]?.weather_desc || null;
    const description = dayForecast[0]?.weather_desc_en || condition || null;

    const transformed = {
      location: {
        province: bmkgData.lokasi.provinsi,
        city: bmkgData.lokasi.kotkab,
        district: bmkgData.lokasi.kecamatan,
        village: bmkgData.lokasi.desa,
        code: bmkgData.lokasi.adm4,
        coordinates: {
          longitude: bmkgData.lokasi.lon,
          latitude: bmkgData.lokasi.lat,
        },
        timezone: bmkgData.lokasi.timezone,
      },
      current: dayIndex === 0 ? undefined : null,
      forecasts: {
        day: dayForecast.map((f: any) => ({
          temperature: f.t,
          condition: f.weather_desc,
          humidity: f.hu,
          windSpeed: f.ws,
          precipitation: f.tp,
          datetime: f.local_datetime,
          timeIndex: f.time_index,
        })),
      },
      condition,
      description,
    } as any;

    if (options?.includeRaw) {
      return { ...transformed, raw: bmkgData };
    }

    return transformed;
  }
}
