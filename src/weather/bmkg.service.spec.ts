import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { BMKGService, BMKGWeatherData } from './bmkg.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BMKGService', () => {
  let service: BMKGService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BMKGService],
    }).compile();

    service = module.get<BMKGService>(BMKGService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherForecast', () => {
    const mockBMKGData: BMKGWeatherData = {
      lokasi: {
        adm1: '35',
        adm2: '35.02',
        adm3: '35.02.17',
        adm4: '35.02.17.1015',
        provinsi: 'Jawa Timur',
        kotkab: 'Ponorogo',
        kecamatan: 'Ponorogo',
        desa: 'Nologaten',
        lon: 111.4749052623,
        lat: -7.8618785936,
        timezone: 'Asia/Jakarta',
      },
      data: [
        {
          lokasi: {
            adm1: '35',
            adm2: '35.02',
            adm3: '35.02.17',
            adm4: '35.02.17.1015',
            provinsi: 'Jawa Timur',
            kotkab: 'Ponorogo',
            kecamatan: 'Ponorogo',
            desa: 'Nologaten',
            lon: 111.4749052623,
            lat: -7.8618785936,
            timezone: '+0700',
            type: 'adm4',
          },
          cuaca: [
            [
              {
                datetime: '2025-11-22T11:00:00Z',
                t: 25,
                tcc: 100,
                tp: 0,
                weather: 3,
                weather_desc: 'Berawan',
                weather_desc_en: 'Mostly Cloudy',
                wd_deg: 99,
                wd: 'E',
                wd_to: 'W',
                ws: 6.9,
                hu: 86,
                vs: 19994,
                vs_text: '> 10 km',
                time_index: '10-11',
                analysis_date: '2025-11-22T00:00:00',
                image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/berawan-pm.svg',
                utc_datetime: '2025-11-22 11:00:00',
                local_datetime: '2025-11-22 18:00:00',
              },
            ],
            [
              {
                datetime: '2025-11-23T05:00:00Z',
                t: 30,
                tcc: 28,
                tp: 0,
                weather: 1,
                weather_desc: 'Cerah',
                weather_desc_en: 'Sunny',
                wd_deg: 8,
                wd: 'N',
                wd_to: 'S',
                ws: 5.9,
                hu: 64,
                vs: 19990,
                vs_text: '> 10 km',
                time_index: '25-26',
                analysis_date: '2025-11-22T00:00:00',
                image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah-am.svg',
                utc_datetime: '2025-11-23 02:00:00',
                local_datetime: '2025-11-23 09:00:00',
              },
            ],
          ],
        },
      ],
    };

    it('should fetch weather forecast successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockBMKGData });

      const result = await service.getWeatherForecast('35.02.17.1015');

      expect(result).toEqual(mockBMKGData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.bmkg.go.id/publik/prakiraan-cuaca',
        {
          params: { adm4: '35.02.17.1015' },
          timeout: 10000,
        },
      );
    });

    it('should throw HttpException with 404 when data not found', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Data not found', error: 'Not Found', statusCode: 404 },
        },
        isAxiosError: true,
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(service.getWeatherForecast('35.02.17.9999')).rejects.toThrow(
        HttpException,
      );

      await expect(service.getWeatherForecast('35.02.17.9999')).rejects.toThrow(
        'Data prakiraan cuaca tidak ditemukan untuk kode wilayah 35.02.17.9999',
      );
    });

    it('should throw HttpException with 408 when timeout', async () => {
      const axiosError = {
        code: 'ECONNABORTED',
        isAxiosError: true,
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(service.getWeatherForecast('35.02.17.1015')).rejects.toThrow(
        HttpException,
      );

      await expect(service.getWeatherForecast('35.02.17.1015')).rejects.toThrow(
        'Timeout saat mengambil data dari BMKG API',
      );
    });

    it('should throw HttpException for other axios errors', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
        message: 'Network Error',
        isAxiosError: true,
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(service.getWeatherForecast('35.02.17.1015')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException for non-axios errors', async () => {
      const error = new Error('Unexpected error');
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockedAxios.get.mockRejectedValue(error);

      await expect(service.getWeatherForecast('35.02.17.1015')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('transformBMKGData', () => {
    const mockBMKGData: BMKGWeatherData = {
      lokasi: {
        adm1: '35',
        adm2: '35.02',
        adm3: '35.02.17',
        adm4: '35.02.17.1015',
        provinsi: 'Jawa Timur',
        kotkab: 'Ponorogo',
        kecamatan: 'Ponorogo',
        desa: 'Nologaten',
        lon: 111.4749052623,
        lat: -7.8618785936,
        timezone: 'Asia/Jakarta',
      },
      data: [
        {
          lokasi: {
            adm1: '35',
            adm2: '35.02',
            adm3: '35.02.17',
            adm4: '35.02.17.1015',
            provinsi: 'Jawa Timur',
            kotkab: 'Ponorogo',
            kecamatan: 'Ponorogo',
            desa: 'Nologaten',
            lon: 111.4749052623,
            lat: -7.8618785936,
            timezone: '+0700',
            type: 'adm4',
          },
          cuaca: [
            [
              {
                datetime: '2025-11-22T11:00:00Z',
                t: 25,
                tcc: 100,
                tp: 0,
                weather: 3,
                weather_desc: 'Berawan',
                weather_desc_en: 'Mostly Cloudy',
                wd_deg: 99,
                wd: 'E',
                wd_to: 'W',
                ws: 6.9,
                hu: 86,
                vs: 19994,
                vs_text: '> 10 km',
                time_index: '10-11',
                analysis_date: '2025-11-22T00:00:00',
                image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/berawan-pm.svg',
                utc_datetime: '2025-11-22 11:00:00',
                local_datetime: '2025-11-22 18:00:00',
              },
            ],
            [
              {
                datetime: '2025-11-23T05:00:00Z',
                t: 30,
                tcc: 28,
                tp: 0,
                weather: 1,
                weather_desc: 'Cerah',
                weather_desc_en: 'Sunny',
                wd_deg: 8,
                wd: 'N',
                wd_to: 'S',
                ws: 5.9,
                hu: 64,
                vs: 19990,
                vs_text: '> 10 km',
                time_index: '25-26',
                analysis_date: '2025-11-22T00:00:00',
                image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah-am.svg',
                utc_datetime: '2025-11-23 02:00:00',
                local_datetime: '2025-11-23 09:00:00',
              },
            ],
            [
              {
                datetime: '2025-11-24T05:00:00Z',
                t: 32,
                tcc: 50,
                tp: 0,
                weather: 2,
                weather_desc: 'Cerah Berawan',
                weather_desc_en: 'Partly Cloudy',
                wd_deg: 10,
                wd: 'N',
                wd_to: 'S',
                ws: 4.5,
                hu: 70,
                vs: 20000,
                vs_text: '> 10 km',
                time_index: '48-49',
                analysis_date: '2025-11-22T00:00:00',
                image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah-berawan-am.svg',
                utc_datetime: '2025-11-24 02:00:00',
                local_datetime: '2025-11-24 09:00:00',
              },
            ],
          ],
        },
      ],
    };

    it('should transform BMKG data correctly', () => {
      const result = service.transformBMKGData(mockBMKGData);

      expect(result).toBeDefined();
      expect(result?.location).toEqual({
        province: 'Jawa Timur',
        city: 'Ponorogo',
        district: 'Ponorogo',
        village: 'Nologaten',
        code: '35.02.17.1015',
        coordinates: {
          longitude: 111.4749052623,
          latitude: -7.8618785936,
        },
        timezone: 'Asia/Jakarta',
      });

      expect(result?.current).toBeDefined();
      expect(result?.current?.temperature).toBe(25);
      expect(result?.current?.condition).toBe('Berawan');
      expect(result?.current?.humidity).toBe(86);
      expect(result?.current?.windSpeed).toBe(6.9);

      expect(result?.forecasts.today).toHaveLength(1);
      expect(result?.forecasts.tomorrow).toHaveLength(1);
      expect(result?.forecasts.dayAfter).toHaveLength(1);

      expect(result?.raw).toEqual(mockBMKGData);
    });

    it('should return null when data is empty', () => {
      const emptyData: BMKGWeatherData = {
        lokasi: {
          adm1: '35',
          adm2: '35.02',
          adm3: '35.02.17',
          adm4: '35.02.17.1015',
          provinsi: 'Jawa Timur',
          kotkab: 'Ponorogo',
          kecamatan: 'Ponorogo',
          desa: 'Nologaten',
          lon: 111.4749052623,
          lat: -7.8618785936,
          timezone: 'Asia/Jakarta',
        },
        data: [],
      };

      const result = service.transformBMKGData(emptyData);
      expect(result).toBeNull();
    });

    it('should handle missing current forecast', () => {
      const dataWithoutCurrent: BMKGWeatherData = {
        ...mockBMKGData,
        data: [
          {
            ...mockBMKGData.data[0],
            cuaca: [
              [], // Empty today forecast
              mockBMKGData.data[0].cuaca[1],
              mockBMKGData.data[0].cuaca[2],
            ],
          },
        ],
      };

      const result = service.transformBMKGData(dataWithoutCurrent);
      expect(result?.current).toBeNull();
      expect(result?.forecasts.today).toHaveLength(0);
    });
  });
});

