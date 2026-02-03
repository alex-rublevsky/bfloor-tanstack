/**
 * Environment Variables Utility
 *
 * Single source of truth for app config. All access via process.env (no runtime secret fetching).
 *
 * Production (Yandex Serverless Container): All secrets and config are in Yandex Lockbox. At deploy
 * time, the platform injects each Lockbox key as an environment variable (--secret ...). No Lockbox
 * API calls at runtime; safest and most performant.
 *
 * Local / Vercel: Set variables in .env or platform env. Same code path: read process.env only.
 */

/**
 * Get an optional environment variable value
 * @param key - The environment variable key
 * @returns The environment variable value or null
 */
function getEnvOptional(key: string): string | null {
	return process.env[key] ?? null;
}

/**
 * Centralized environment variables access
 * All environment variables should be accessed through this object
 */
export const env = {
	// Database (no longer needed with Turso, but kept for compatibility)
	// DB is now accessed via db.ts

	// Storage (Yandex Object Storage). Prod: injected from Lockbox at deploy. Local: .env.
	BFLOOR_STORAGE_BUCKET: getEnvOptional("BFLOOR_STORAGE_BUCKET"),
	AWS_ACCESS_KEY_ID: getEnvOptional("AWS_ACCESS_KEY_ID"),
	AWS_SECRET_ACCESS_KEY: getEnvOptional("AWS_SECRET_ACCESS_KEY"),
	AWS_S3_ENDPOINT: getEnvOptional("AWS_S3_ENDPOINT"),

	// Admin emails (comma-separated list)
	ADMIN_EMAILS: getEnvOptional("ADMIN_EMAILS"),

	// Auth
	BETTER_AUTH_URL:
		getEnvOptional("BETTER_AUTH_URL") ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
		"http://localhost:3000",
	BETTER_AUTH_SECRET: getEnvOptional("BETTER_AUTH_SECRET"),
	GOOGLE_CLIENT_ID: getEnvOptional("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: getEnvOptional("GOOGLE_CLIENT_SECRET"),

	// Email
	RESEND_API_KEY: getEnvOptional("RESEND_API_KEY"),

	// Turso Database
	TURSO_DATABASE_URL: getEnvOptional("TURSO_DATABASE_URL"),
	TURSO_AUTH_TOKEN: getEnvOptional("TURSO_AUTH_TOKEN"),
};
