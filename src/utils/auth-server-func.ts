import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "~/utils/auth-middleware";
import { env } from "~/utils/env";

type User = {
	id?: string;
	name?: string;
	email?: string;
	image?: string | null;
} | null;

type AuthContext = {
	user: User;
};

/**
 * Parse and cache admin emails from environment variable.
 * Creates a Set for O(1) lookup performance.
 * ADMIN_EMAILS should be a comma-separated list: "email1@example.com,email2@example.com"
 */
const adminEmailsSet = new Set(
	(env.ADMIN_EMAILS || "")
		.split(",")
		.map((email) => email.trim().toLowerCase())
		.filter((email) => email.length > 0),
);

/**
 * Check if a user email matches any of the admin emails.
 * Uses Set for O(1) lookup performance.
 *
 * @param userEmail - The user's email address (normalized)
 * @returns true if the email matches any admin email, false otherwise
 */
function isAdminEmail(userEmail: string | null): boolean {
	if (!userEmail) {
		return false;
	}

	// O(1) Set lookup (much faster than array.includes)
	return adminEmailsSet.has(userEmail.trim().toLowerCase());
}

/**
 * Get complete user data with admin status in a single call.
 * This is the most efficient way to get user info + auth status.
 * Use this for protected routes that need user data.
 */
export const getUserData = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }: { context: AuthContext }) => {
		const user = context?.user;
		const userEmailRaw = user?.email ?? null;

		const userEmail = userEmailRaw?.trim().toLowerCase() ?? null;
		const isAuthenticated = !!userEmail;
		const isAdmin = isAuthenticated && isAdminEmail(userEmail);

		return {
			userID: user?.id ?? null,
			userName: user?.name ?? null,
			userEmail: userEmail,
			userAvatar: user?.image ?? null,
			isAuthenticated,
			isAdmin,
		};
	});

/**
 * Lightweight auth status check without throwing errors.
 * Use this for public pages (e.g., login) that need to check auth status.
 */
export const getAuthStatus = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }: { context: AuthContext }) => {
		const userEmailRaw = context?.user?.email ?? null;

		const userEmail = userEmailRaw?.trim().toLowerCase() ?? null;
		const isAuthenticated = !!userEmail;
		const isAdmin = isAuthenticated && isAdminEmail(userEmail);

		return {
			isAuthenticated,
			isAdmin,
			userEmail,
		};
	});
