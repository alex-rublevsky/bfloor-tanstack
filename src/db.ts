import { drizzle } from "drizzle-orm/libsql/http";
import * as schema from "~/schema";

/**
 * Create a Drizzle database instance using the native libsql/http adapter.
 * This replaces the old sqlite-proxy adapter and gives us:
 * - Native transaction support (db.transaction())
 * - Batch API support (db.batch())
 * - Simpler setup (no manual SQL routing)
 */
function createDb() {
	const url = process.env.TURSO_DATABASE_URL;
	const authToken = process.env.TURSO_AUTH_TOKEN;

	if (!url) {
		throw new Error("TURSO_DATABASE_URL environment variable is required");
	}

	return drizzle({
		connection: { url, authToken },
		schema,
	});
}

/** Full database instance type (returned by DB()) */
export type AppDatabase = ReturnType<typeof createDb>;

/**
 * Database context type — works for both `db` and transaction `tx` contexts.
 * Use this for utility functions that can run inside or outside transactions.
 *
 * Both LibSQLDatabase and SQLiteTransaction share the same query API
 * (select, insert, update, delete) but TypeScript union types break
 * overload resolution on these methods. We use the db type directly
 * and callers pass `tx` via a safe cast — the query methods are identical.
 */
export type DbContext = AppDatabase;

let db: AppDatabase | null = null;

export function DB(): AppDatabase {
	if (!db) {
		db = createDb();
	}
	return db;
}
