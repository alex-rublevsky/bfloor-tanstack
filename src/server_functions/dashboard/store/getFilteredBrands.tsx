import { createServerFn } from "@tanstack/react-start";
import { eq, type SQL, sql } from "drizzle-orm";
import { DB } from "~/db";
import { brands, productStoreLocations, products } from "~/schema";

/**
 * Get brands filtered by current filter selection (Dashboard version - includes inactive products)
 * Only returns brands that have products matching the current filters
 * Uses a single JOIN query for maximum performance
 */
export const getFilteredBrandsDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data: {
				categorySlug?: string;
				collectionSlug?: string;
				storeLocationId?: number;
			} = {},
		) => data,
	)
	.handler(async ({ data = {} }) => {
		try {
			const db = DB();
			const conditions: SQL[] = [sql`${products.brandSlug} IS NOT NULL`];
			// No isActive filter for dashboard

			// Apply filters
			if (data.categorySlug) {
				conditions.push(eq(products.categorySlug, data.categorySlug));
			}
			if (data.collectionSlug) {
				conditions.push(eq(products.collectionSlug, data.collectionSlug));
			}

			const whereCondition = sql.join(conditions, sql` AND `);

			// OPTIMIZED: Single query with JOIN and optional store location filter
			// Uses INNER JOIN with brands and optional INNER JOIN with product_store_locations
			let query = db
				.selectDistinct({
					id: brands.id,
					name: brands.name,
					slug: brands.slug,
					image: brands.image,
					countryId: brands.countryId,
					isActive: brands.isActive,
				})
				.from(products)
				.innerJoin(brands, eq(products.brandSlug, brands.slug))
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

			const brandsResult = await query.all();

			return brandsResult;
		} catch (error) {
			console.error("Error fetching filtered brands (dashboard):", error);
			throw new Error("Failed to fetch filtered brands");
		}
	});
