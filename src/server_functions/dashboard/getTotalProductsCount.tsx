import { createServerFn } from "@tanstack/react-start";
import { count } from "drizzle-orm";
import { DB } from "~/db";
import { products } from "~/schema";

/**
 * Efficiently gets total products count using SQL COUNT
 * Optimized for Cloudflare D1:
 * - Uses Drizzle's count() aggregation function
 * - Single SQL query - much more efficient than fetching all products
 * - Aggressively cached via TanStack Query (3 days staleTime, 7 days gcTime)
 */
export const getTotalProductsCount = createServerFn({ method: "GET" })
	.inputValidator(() => ({}))
	.handler(async (): Promise<number> => {
		const db = DB();

		const result = await db
			.select({ count: count(products.id) })
			.from(products);

		return result[0]?.count ?? 0;
	});
