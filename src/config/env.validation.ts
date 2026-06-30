import Joi from 'joi';

// Coerce string env to number (process.env values are always strings)
const numberFromEnv = Joi.alternatives().try(
  Joi.number(),
  Joi.string().custom((val, helpers) => {
    if (val === '' || val === undefined) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? helpers.error('number.base') : n;
  }),
);

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: numberFromEnv.default(3000),

  // CORS: required in production (comma-separated origins allowed)
  CORS_ORIGIN: Joi.string()
    .when('NODE_ENV', { is: 'production', then: Joi.string().required().min(1), otherwise: Joi.optional() }),

  // Database
  DATABASE_URL: Joi.string().optional(),
  DB_TYPE: Joi.string().valid('postgres', 'sqlite').optional(),
  DB_HOST: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_PORT: numberFromEnv.when('DB_TYPE', {
    is: 'postgres',
    then: numberFromEnv.required(),
    otherwise: numberFromEnv.optional(),
  }),
  DB_USERNAME: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_PASSWORD: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_NAME: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_PATH: Joi.string().when('DB_TYPE', {
    is: 'sqlite',
    then: Joi.optional().default('sibubur.db'),
    otherwise: Joi.optional(),
  }),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // Rate Limiting
  THROTTLE_TTL: numberFromEnv.default(60),
  THROTTLE_LIMIT: numberFromEnv.default(100),

  // Cache (reports TTL in milliseconds)
  CACHE_TTL_REPORT: numberFromEnv.default(120000),

  // Weather
  WEATHER_ADM4: Joi.string().optional(),
  KEEP_WEATHER_DAYS: numberFromEnv.default(90),

  // Logging: in production, request log only when LOG_LEVEL=debug or sampled (LOG_SAMPLE_RATE 0-1)
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_SAMPLE_RATE: Joi.alternatives()
    .try(
      Joi.number().min(0).max(1),
      Joi.string().custom((val, helpers) => {
        if (val === '' || val === undefined) return 0.01;
        const n = Number(val);
        if (Number.isNaN(n) || n < 0 || n > 1) return helpers.error('number.base');
        return n;
      }),
    )
    .default(0.01),
});
