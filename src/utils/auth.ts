// ============================================================================
// BETTER AUTH WITH TURSO DATABASE
// ============================================================================
// Using Drizzle adapter with SQLite provider (Turso is SQLite-compatible)
// ============================================================================

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { DB } from "~/db";
import { schema } from "../schema";
import { env } from "./env";

export const auth = betterAuth({
	database: drizzleAdapter(DB(), {
		provider: "sqlite", // Turso is SQLite-compatible
		schema: schema,
	}),
	baseURL: env.BETTER_AUTH_URL || "http://localhost:3000",
	secret: env.BETTER_AUTH_SECRET || "",
	trustedOrigins: [
		"https://bfloor.ru",
		"https://www.bfloor.ru",
		"http://localhost:3000",
		...(process.env.NODE_ENV === "development"
			? ["http://localhost:5173"]
			: []),
	],
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID || "",
			clientSecret: env.GOOGLE_CLIENT_SECRET || "",
		},
	},
	plugins: [tanstackStartCookies()],
});
