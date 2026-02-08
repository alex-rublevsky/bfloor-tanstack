import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { sql } from "drizzle-orm";
import { DB } from "~/db";
import { ApiError } from "~/utils/ApiError";

interface OrphanReport {
	table: string;
	description: string;
	count: number;
}

interface CleanupResult {
	mode: "audit" | "clean";
	orphans: OrphanReport[];
	totalOrphaned: number;
	totalCleaned: number;
}

/**
 * Audits and optionally cleans up orphaned rows in junction tables.
 *
 * Because Turso/libsql doesn't enforce foreign keys over HTTP,
 * cascade deletes never fire. This function finds (and optionally
 * removes) any rows left behind by past deletions.
 *
 * mode = "audit" → read-only report of orphaned rows
 * mode = "clean" → delete orphaned rows inside a transaction
 */
export const cleanupOrphanedData = createServerFn({ method: "POST" })
	.inputValidator((data: { mode: "audit" | "clean" }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { mode } = data;

			// Define all orphan queries: each returns a count of rows that reference non-existent parents
			const orphanQueries: Array<{
				table: string;
				description: string;
				countSql: ReturnType<typeof sql>;
				cleanSql: ReturnType<typeof sql>;
			}> = [
				// -- Junction tables with orphaned productId --
				{
					table: "product_brands",
					description: "productBrands rows referencing deleted products",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_brands WHERE product_id NOT IN (SELECT id FROM products)`,
					cleanSql: sql`DELETE FROM product_brands WHERE product_id NOT IN (SELECT id FROM products)`,
				},
				{
					table: "product_collections",
					description: "productCollections rows referencing deleted products",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_collections WHERE product_id NOT IN (SELECT id FROM products)`,
					cleanSql: sql`DELETE FROM product_collections WHERE product_id NOT IN (SELECT id FROM products)`,
				},
				{
					table: "product_store_locations",
					description:
						"productStoreLocations rows referencing deleted products",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_store_locations WHERE product_id NOT IN (SELECT id FROM products)`,
					cleanSql: sql`DELETE FROM product_store_locations WHERE product_id NOT IN (SELECT id FROM products)`,
				},
				{
					table: "product_attribute_values",
					description:
						"productAttributeValues rows referencing deleted products",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_attribute_values WHERE product_id NOT IN (SELECT id FROM products)`,
					cleanSql: sql`DELETE FROM product_attribute_values WHERE product_id NOT IN (SELECT id FROM products)`,
				},
				{
					table: "product_variations",
					description: "productVariations rows referencing deleted products",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_variations WHERE product_id NOT IN (SELECT id FROM products)`,
					cleanSql: sql`DELETE FROM product_variations WHERE product_id NOT IN (SELECT id FROM products)`,
				},

				// -- Junction tables with orphaned brand/collection slugs --
				{
					table: "product_brands (slug)",
					description: "productBrands rows referencing deleted/renamed brands",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_brands WHERE brand_slug NOT IN (SELECT slug FROM brands)`,
					cleanSql: sql`DELETE FROM product_brands WHERE brand_slug NOT IN (SELECT slug FROM brands)`,
				},
				{
					table: "product_collections (slug)",
					description:
						"productCollections rows referencing deleted/renamed collections",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_collections WHERE collection_slug NOT IN (SELECT slug FROM collections)`,
					cleanSql: sql`DELETE FROM product_collections WHERE collection_slug NOT IN (SELECT slug FROM collections)`,
				},

				// -- variationAttributes referencing deleted variations --
				{
					table: "variation_attributes",
					description:
						"variationAttributes rows referencing deleted variations",
					countSql: sql`SELECT COUNT(*) as cnt FROM variation_attributes WHERE product_variation_id NOT IN (SELECT id FROM product_variations)`,
					cleanSql: sql`DELETE FROM variation_attributes WHERE product_variation_id NOT IN (SELECT id FROM product_variations)`,
				},

				// -- productAttributeValues referencing deleted attributes or values --
				{
					table: "product_attribute_values (attr)",
					description:
						"productAttributeValues rows referencing deleted attributes",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_attribute_values WHERE attribute_id NOT IN (SELECT id FROM product_attributes)`,
					cleanSql: sql`DELETE FROM product_attribute_values WHERE attribute_id NOT IN (SELECT id FROM product_attributes)`,
				},
				{
					table: "product_attribute_values (value)",
					description: "productAttributeValues rows referencing deleted values",
					countSql: sql`SELECT COUNT(*) as cnt FROM product_attribute_values WHERE value_id NOT IN (SELECT id FROM attribute_values)`,
					cleanSql: sql`DELETE FROM product_attribute_values WHERE value_id NOT IN (SELECT id FROM attribute_values)`,
				},

				// -- orderItems referencing deleted products/variations --
				{
					table: "order_items (product)",
					description: "orderItems rows referencing deleted products",
					countSql: sql`SELECT COUNT(*) as cnt FROM order_items WHERE productId NOT IN (SELECT id FROM products)`,
					cleanSql: sql`DELETE FROM order_items WHERE productId NOT IN (SELECT id FROM products)`,
				},
				{
					table: "order_items (variation)",
					description:
						"orderItems with invalid variationId (not null, not in variations)",
					countSql: sql`SELECT COUNT(*) as cnt FROM order_items WHERE productVariationId IS NOT NULL AND productVariationId NOT IN (SELECT id FROM product_variations)`,
					cleanSql: sql`UPDATE order_items SET productVariationId = NULL WHERE productVariationId IS NOT NULL AND productVariationId NOT IN (SELECT id FROM product_variations)`,
				},

				// -- Dangling slug references on products table --
				{
					table: "products (brandSlug)",
					description: "products with brandSlug that doesn't match any brand",
					countSql: sql`SELECT COUNT(*) as cnt FROM products WHERE brand_slug IS NOT NULL AND brand_slug NOT IN (SELECT slug FROM brands)`,
					cleanSql: sql`UPDATE products SET brand_slug = NULL WHERE brand_slug IS NOT NULL AND brand_slug NOT IN (SELECT slug FROM brands)`,
				},
				{
					table: "products (categorySlug)",
					description:
						"products with categorySlug that doesn't match any category",
					countSql: sql`SELECT COUNT(*) as cnt FROM products WHERE category_slug IS NOT NULL AND category_slug NOT IN (SELECT slug FROM categories)`,
					cleanSql: sql`UPDATE products SET category_slug = NULL WHERE category_slug IS NOT NULL AND category_slug NOT IN (SELECT slug FROM categories)`,
				},
				{
					table: "products (collectionSlug)",
					description:
						"products with collectionSlug that doesn't match any collection",
					countSql: sql`SELECT COUNT(*) as cnt FROM products WHERE collection_slug IS NOT NULL AND collection_slug NOT IN (SELECT slug FROM collections)`,
					cleanSql: sql`UPDATE products SET collection_slug = NULL WHERE collection_slug IS NOT NULL AND collection_slug NOT IN (SELECT slug FROM collections)`,
				},

				// -- Collections referencing deleted brands --
				{
					table: "collections (brandSlug)",
					description:
						"collections with brandSlug that doesn't match any brand",
					countSql: sql`SELECT COUNT(*) as cnt FROM collections WHERE brand_slug NOT IN (SELECT slug FROM brands)`,
					cleanSql: sql`DELETE FROM collections WHERE brand_slug NOT IN (SELECT slug FROM brands)`,
				},

				// -- Child categories referencing deleted parent categories --
				{
					table: "categories (parentSlug)",
					description:
						"child categories with parentSlug that doesn't match any category",
					countSql: sql`SELECT COUNT(*) as cnt FROM categories WHERE parent_slug IS NOT NULL AND parent_slug NOT IN (SELECT slug FROM categories)`,
					cleanSql: sql`UPDATE categories SET parent_slug = NULL WHERE parent_slug IS NOT NULL AND parent_slug NOT IN (SELECT slug FROM categories)`,
				},
			];

			// --- AUDIT phase: count all orphans ---
			const orphans: OrphanReport[] = [];
			let totalOrphaned = 0;

			for (const query of orphanQueries) {
				const result = await db.all<{ cnt: number }>(query.countSql);
				const count = result[0]?.cnt ?? 0;

				if (count > 0) {
					orphans.push({
						table: query.table,
						description: query.description,
						count,
					});
					totalOrphaned += count;
				}
			}

			if (mode === "audit" || totalOrphaned === 0) {
				return {
					mode: "audit",
					orphans,
					totalOrphaned,
					totalCleaned: 0,
				} satisfies CleanupResult;
			}

			// --- CLEAN phase: delete all orphans in a transaction ---
			let totalCleaned = 0;

			await db.transaction(async (tx) => {
				for (const query of orphanQueries) {
					// Re-count inside transaction to be precise
					const result = await tx.all<{ cnt: number }>(query.countSql);
					const count = result[0]?.cnt ?? 0;

					if (count > 0) {
						await tx.run(query.cleanSql);
						totalCleaned += count;
					}
				}
			});

			return {
				mode: "clean",
				orphans,
				totalOrphaned,
				totalCleaned,
			} satisfies CleanupResult;
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error during orphaned data cleanup:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
