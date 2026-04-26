import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "./schema"
import Database from 'better-sqlite3';

const sqlite = new Database('storq.db');
export const db = drizzle({ client: sqlite, schema });