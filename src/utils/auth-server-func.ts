import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "~/utils/auth-middleware";

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
 * Get admin emails Set from current env (read at request time so secrets/env updates are always used).
 * ADMIN_EMAILS: comma-separated list, e.g. "a@x.com,b@y.com" (spaces/newlines around entries are trimmed).
 */
function getAdminEmailsSet(): Set<string> {
	const raw =
		typeof process !== "undefined" && process.env?.ADMIN_EMAILS != null
			? process.env.ADMIN_EMAILS
			: "";
	const list = raw
		.split(/[\s,]+/)
		.map((email) => email.trim().toLowerCase())
		.filter((email) => email.length > 0);
	return new Set(list);
}

/**
 * Check if a user email matches any of the admin emails.
 *
 * @param userEmail - The user's email address (normalized)
 * @returns true if the email matches any admin email, false otherwise
 */
function isAdminEmail(userEmail: string | null): boolean {
	if (!userEmail) {
		return false;
	}
	const normalized = userEmail.trim().toLowerCase();
	return getAdminEmailsSet().has(normalized);
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
