import { createServerFn } from "@tanstack/react-start";
import { count, eq } from "drizzle-orm";
import { DB } from "~/db";
import { collections, products } from "~/schema";

export type CollectionCounts = Record<number, number>;

/**
 * Gets product counts per collection using a single LEFT JOIN + GROUP BY query.
 * Previous version used 2 queries (SELECT * from collections + GROUP BY on products).
 * Now combines both into one query that returns collectionId -> productCount directly.
 *
 * Returns a map: collectionId -> productCount
 */
export const getProductCollectionCounts = createServerFn({ method: "GET" })
	.inputValidator(() => ({}))
	.handler(async (): Promise<CollectionCounts> => {
		const db = DB();

		// Single query: JOIN collections with products, GROUP BY collection ID
		// LEFT JOIN ensures we get all collections (even those with 0 products)
		const countsResult = await db
			.select({
				collectionId: collections.id,
				count: count(products.id),
			})
			.from(collections)
			.leftJoin(products, eq(products.collectionSlug, collections.slug))
			.groupBy(collections.id)
			.all();

		const counts: CollectionCounts = {};
		for (const row of countsResult) {
			counts[row.collectionId] = row.count;
		}

		return counts;
	});
