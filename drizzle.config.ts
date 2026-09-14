import type { Config } from 'drizzle-kit';

export default {
  schema: './src/services/database/schema.ts',
  out: './src/services/database/drizzle-migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
