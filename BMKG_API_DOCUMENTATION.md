# Dokumentasi Integrasi API BMKG Prakiraan Cuaca

## Overview
Backend aplikasi ini telah terintegrasi dengan API BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) untuk mengambil data prakiraan cuaca.

## Endpoint BMKG

### GET `/weather/bmkg/forecast`

Mengambil prakiraan cuaca dari API BMKG berdasarkan kode wilayah administrasi tingkat IV (adm4).

#### Query Parameters

- `adm4` (required): Kode wilayah administrasi tingkat IV
  - Format: `provinsi.kabupaten.kecamatan.desa`
  - Contoh: `31.71.03.1001` (Kemayoran, Jakarta Pusat)
  - Contoh: `35.02.17.1015` (Ponorogo, Jawa Timur - Desa Nologaten)

- `transform` (optional): Jika `true`, mengembalikan data yang sudah ditransformasi ke format yang lebih sederhana
  - Default: `false` (mengembalikan raw data dari BMKG)

#### Contoh Request

```bash
# Raw data dari BMKG
curl -X GET "http://localhost:3000/weather/bmkg/forecast?adm4=35.02.17.1015" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Data yang sudah ditransformasi
curl -X GET "http://localhost:3000/weather/bmkg/forecast?adm4=35.02.17.1015&transform=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response (Raw Data)

```json
{
  "lokasi": {
    "adm1": "35",
    "adm2": "35.02",
    "adm3": "35.02.17",
    "adm4": "35.02.17.1015",
    "provinsi": "Jawa Timur",
    "kotkab": "Ponorogo",
    "kecamatan": "Ponorogo",
    "desa": "Nologaten",
    "lon": 111.4749052623,
    "lat": -7.8618785936,
    "timezone": "Asia/Jakarta"
  },
  "data": [
    {
      "lokasi": { ... },
      "cuaca": [
        [
          {
            "datetime": "2025-11-22T11:00:00Z",
            "t": 25,
            "tcc": 100,
            "tp": 0,
            "weather": 3,
            "weather_desc": "Berawan",
            "weather_desc_en": "Mostly Cloudy",
            "wd_deg": 99,
            "wd": "E",
            "wd_to": "W",
            "ws": 6.9,
            "hu": 86,
            "vs": 19994,
            "vs_text": "> 10 km",
            "time_index": "10-11",
            "analysis_date": "2025-11-22T00:00:00",
            "image": "https://api-apps.bmkg.go.id/storage/icon/cuaca/berawan-pm.svg",
            "utc_datetime": "2025-11-22 11:00:00",
            "local_datetime": "2025-11-22 18:00:00"
          }
        ]
      ]
    }
  ]
}
```

#### Response (Transformed Data)

Ketika `transform=true`, response akan lebih sederhana:

```json
{
  "location": {
    "province": "Jawa Timur",
    "city": "Ponorogo",
    "district": "Ponorogo",
    "village": "Nologaten",
    "code": "35.02.17.1015",
    "coordinates": {
      "longitude": 111.4749052623,
      "latitude": -7.8618785936
    },
    "timezone": "Asia/Jakarta"
  },
  "current": {
    "temperature": 25,
    "condition": "Berawan",
    "conditionEn": "Mostly Cloudy",
    "humidity": 86,
    "windSpeed": 6.9,
    "windDirection": "E",
    "visibility": "> 10 km",
    "precipitation": 0,
    "cloudCover": 100,
    "datetime": "2025-11-22 18:00:00",
    "image": "https://api-apps.bmkg.go.id/storage/icon/cuaca/berawan-pm.svg"
  },
  "forecasts": {
    "today": [...],
    "tomorrow": [...],
    "dayAfter": [...]
  },
  "raw": { ... }
}
```

## Kode Wilayah untuk Ponorogo, Jawa Timur

### Kecamatan Ponorogo

- **Kode adm4**: `35.02.17.1015`
- **Lokasi**: Desa Nologaten, Kecamatan Ponorogo, Kabupaten Ponorogo, Jawa Timur
- **Koordinat**: 
  - Longitude: 111.4749052623
  - Latitude: -7.8618785936

### Format Kode Wilayah

Kode wilayah mengikuti format:
```
provinsi.kabupaten.kecamatan.desa
```

- **35**: Jawa Timur
- **35.02**: Kabupaten Ponorogo
- **35.02.17**: Kecamatan Ponorogo
- **35.02.17.1015**: Desa/Kelurahan (dalam contoh ini: Desa Nologaten)

### Daftar Desa/Kelurahan di Kecamatan Ponorogo

Berikut adalah beberapa kode adm4 untuk desa/kelurahan lain di Kecamatan Ponorogo:
- `35.02.17.1001` - Desa Paju
- `35.02.17.1002` - Desa Brotonegaran
- `35.02.17.1003` - Desa Pakunden
- `35.02.17.1004` - Desa Kepatihan
- `35.02.17.1005` - Desa Surodikraman
- `35.02.17.1006` - Desa Purbosuman
- `35.02.17.1007` - Desa Tonatan
- `35.02.17.1008` - Desa Bangunsari
- `35.02.17.1009` - Desa Tamanarum
- `35.02.17.1010` - Desa Kauman
- `35.02.17.1011` - Desa Tambakbayan
- `35.02.17.1012` - Desa Pinggirsari
- `35.02.17.1013` - Desa Mangkujayan
- `35.02.17.1014` - Desa Banyudono
- `35.02.17.1015` - Desa Nologaten ⭐ (Lokasi yang digunakan)
- `35.02.17.1016` - Desa Cokromenggalan

### Mencari Kode Wilayah Lain

Untuk mencari kode wilayah adm4 untuk daerah lain:

1. **Referensi Resmi**: 
   - Keputusan Menteri Dalam Negeri Nomor 100.1.1-6117 Tahun 2022
   - Website Kemendagri: https://www.kemendagri.go.id/

2. **Testing API**:
   ```bash
   curl "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=KODE_YANG_INGIN_DICOB A"
   ```
   - Jika berhasil, akan mengembalikan data JSON
   - Jika gagal, akan mengembalikan `{"message":"Data not found","error":"Not Found","statusCode":404}`

3. **Website BMKG**:
   - Kunjungi https://www.bmkg.go.id/cuaca/prakiraan-cuaca/
   - Pilih lokasi yang diinginkan
   - URL akan menampilkan kode wilayah (biasanya 3 level, perlu ditambahkan kode desa/kelurahan)

## Error Handling

API akan mengembalikan error dengan format berikut:

### 404 Not Found
```json
{
  "message": "Data prakiraan cuaca tidak ditemukan untuk kode wilayah 35.02.17.9999. Pastikan kode adm4 yang digunakan benar.",
  "error": "Data not found",
  "statusCode": 404
}
```

### 408 Request Timeout
```json
{
  "message": "Timeout saat mengambil data dari BMKG API",
  "error": "Request timeout",
  "statusCode": 408
}
```

### 500 Internal Server Error
```json
{
  "message": "Gagal mengambil data dari BMKG API: ...",
  "error": "BMKG API Error",
  "statusCode": 500
}
```

## Implementasi di Codebase

### Service: `BMKGService`

File: `backend/src/weather/bmkg.service.ts`

Service ini menangani:
- Fetch data dari API BMKG
- Error handling
- Transform data ke format yang lebih sederhana

### Controller: `WeatherController`

File: `backend/src/weather/weather.controller.ts`

Endpoint baru:
- `GET /weather/bmkg/forecast` - Mengambil prakiraan cuaca dari BMKG

## Contoh Penggunaan

### Di Frontend

```typescript
// Menggunakan weather service
import { weatherService } from '@/lib/services/weather';

// Fetch dari BMKG API melalui backend
const response = await fetch(
  `${API_URL}/weather/bmkg/forecast?adm4=35.02.17.1015&transform=true`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
```

### Di Backend (Service/Controller Lain)

```typescript
import { BMKGService } from '../weather/bmkg.service';

// Inject BMKGService
constructor(private readonly bmkgService: BMKGService) {}

// Gunakan service
const forecast = await this.bmkgService.getWeatherForecast('35.02.17.1015');
const transformed = this.bmkgService.transformBMKGData(forecast);
```

## Catatan Penting

1. **Autentikasi**: Endpoint ini memerlukan JWT token (protected by `JwtAuthGuard`)
2. **Rate Limiting**: BMKG API mungkin memiliki rate limiting, gunakan dengan bijak
3. **Caching**: Pertimbangkan untuk implementasi caching jika data cuaca di-fetch secara berkala
4. **Kode Wilayah**: Pastikan kode adm4 yang digunakan valid dan sesuai dengan lokasi yang diinginkan

## Referensi

- API BMKG: https://api.bmkg.go.id/publik/prakiraan-cuaca
- Website BMKG: https://www.bmkg.go.id/
- Dokumentasi Kode Wilayah: Keputusan Menteri Dalam Negeri Nomor 100.1.1-6117 Tahun 2022

