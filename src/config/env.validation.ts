import Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().optional(),
  DB_TYPE: Joi.string().valid('postgres', 'sqlite').optional(),
  DB_HOST: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_PORT: Joi.number().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
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
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});

