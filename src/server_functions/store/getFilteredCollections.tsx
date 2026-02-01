import { createServerFn } from "@tanstack/react-start";
import { eq, type SQL, sql } from "drizzle-orm";
import { DB } from "~/db";
import { collections, productStoreLocations, products } from "~/schema";

/**
 * Get collections filtered by current filter selection (OPTIMIZED)
 * Only returns collections that have products matching the current filters
 * Uses a single JOIN query for maximum performance
 */
export const getFilteredCollections = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data: {
				categorySlug?: string;
				brandSlug?: string;
				storeLocationId?: number;
			} = {},
		) => data,
	)
	.handler(async ({ data = {} }) => {
		try {
			const db = DB();
			const conditions: SQL[] = [
				sql`${products.collectionSlug} IS NOT NULL`,
				eq(products.isActive, true), // Only active products for store
			];

			// Apply filters
			if (data.categorySlug) {
				conditions.push(eq(products.categorySlug, data.categorySlug));
			}
			if (data.brandSlug) {
				conditions.push(eq(products.brandSlug, data.brandSlug));
			}

			const whereCondition = sql.join(conditions, sql` AND `);

			// OPTIMIZED: Single query with JOIN and optional store location filter
			// Uses INNER JOIN with collections and optional INNER JOIN with product_store_locations
			let query = db
				.selectDistinct({
					id: collections.id,
					name: collections.name,
					slug: collections.slug,
					brandSlug: collections.brandSlug,
					isActive: collections.isActive,
				})
				.from(products)
				.innerJoin(collections, eq(products.collectionSlug, collections.slug))
				.$dynamic();

			// Add store location join if needed
			if (data.storeLocationId !== undefined) {
				query = query
					.innerJoin(
						productStoreLocations,
						eq(productStoreLocations.productId, products.id),
					)
					.where(
						sql`${whereCondition} AND ${productStoreLocations.storeLocationId} = ${data.storeLocationId}`,
					);
			} else {
				query = query.where(whereCondition);
			}

			const collectionsResult = await query.all();

			return collectionsResult;
		} catch (error) {
			console.error("Error fetching filtered collections:", error);
			throw new Error("Failed to fetch filtered collections");
		}
	});
