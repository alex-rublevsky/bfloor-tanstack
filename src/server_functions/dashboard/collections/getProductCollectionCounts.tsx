import { createServerFn } from "@tanstack/react-start";
import { count, sql } from "drizzle-orm";
import { DB } from "~/db";
import { collections, products } from "~/schema";

export type CollectionCounts = Record<number, number>;

/**
 * Efficiently gets product counts per collection using SQL COUNT
 * Optimized for Cloudflare D1:
 * - Uses Drizzle's count() aggregation function with GROUP BY
 * - Single SQL query that counts products per collection
 * - Much more efficient than fetching all products
 * - Returns counts only for collections that have products
 * - Maps collectionSlug to collection ID for consistency with other count functions
 *
 * Returns a map: collectionId -> productCount
 */
export const getProductCollectionCounts = createServerFn({ method: "GET" })
	.inputValidator(() => ({}))
	.handler(async (): Promise<CollectionCounts> => {
		const db = DB();

		// Get all collections for slug-to-ID mapping
		const allCollections = await db.select().from(collections);
		const slugToIdMap = new Map<string, number>();
		allCollections.forEach((collection) => {
			slugToIdMap.set(collection.slug, collection.id);
		});

		// Use Drizzle's count() aggregation function with GROUP BY
		// This leverages Drizzle's optimized COUNT operations
		const countsResult = await db
			.select({
				collectionSlug: products.collectionSlug,
				count: count(products.id),
			})
			.from(products)
			.where(sql`${products.collectionSlug} IS NOT NULL`)
			.groupBy(products.collectionSlug)
			.all();

		// Convert to object: collectionId -> count
		const counts: CollectionCounts = {};
		countsResult.forEach((row) => {
			if (row.collectionSlug) {
				const collectionId = slugToIdMap.get(row.collectionSlug);
				if (collectionId) {
					counts[collectionId] = row.count;
				}
			}
		});

		return counts;
	});
