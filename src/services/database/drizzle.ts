// Drizzle ORM Database Connection for Expo SQLite
// This module initializes Drizzle with expo-sqlite

import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import * as schema from './schema';

const DB_NAME = 'aiwallet.db';

// Open the SQLite database
export const expoDb = SQLite.openDatabaseSync(DB_NAME);

// Create Drizzle instance with full schema
export const db = drizzle(expoDb, { schema });

// Dev-only hook to expose DB in Expo DevTools (Drizzle Studio tab)
export { useDrizzleStudio };

// Export schema for use in queries
export * from './schema';

// Re-export commonly used Drizzle operators
export {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  and,
  or,
  not,
  inArray,
  notInArray,
  like,
  ilike,
  between,
  asc,
  desc,
  sql,
  count,
  sum,
  avg,
  min,
  max,
} from 'drizzle-orm';
