import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray, max, min, type SQL, sql } from "drizzle-orm";
import { DB } from "~/db";
import {
	productBrands,
	productCollections,
	productStoreLocations,
	products,
	productVariations,
} from "~/schema";
import type { ProductVariationWithAttributes } from "~/types";
import { parseVariationAttributes } from "~/utils/productParsing";
import { buildFts5Query } from "~/utils/search/queryExpander";

// GET server function with pagination and filter support (same as dashboard getAllProducts but only returns active products)
export const getStoreData = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data: {
				page?: number;
				limit?: number;
				search?: string;
				categorySlug?: string;
				brandSlugs?: string[]; // Multi-select: array of brand slugs
				collectionSlugs?: string[]; // Multi-select: array of collection slugs
				storeLocationId?: number;
				attributeFilters?: Record<number, string[]>; // attributeId -> array of value IDs
				minPrice?: number;
				maxPrice?: number;
				sort?:
					| "name"
					| "price-asc"
					| "price-desc"
					| "newest"
					| "oldest"
					| "best-selling";
			} = {},
		) => data,
	)
	.handler(async ({ data = {} }) => {
		try {
			const db = DB();
			const { page, limit: pageLimit } = data;
			const rawSearch =
				typeof data.search === "string" ? data.search : undefined;
			const normalizedSearch = rawSearch?.trim().replace(/\s+/g, " ");
			const effectiveSearch =
				normalizedSearch && normalizedSearch.length >= 3
					? normalizedSearch
					: undefined;

			const categoryFilter =
				data.categorySlug && data.categorySlug.length > 0
					? data.categorySlug
					: undefined;
			const brandFilters =
				data.brandSlugs && data.brandSlugs.length > 0
					? data.brandSlugs
					: undefined;
			const collectionFilters =
				data.collectionSlugs && data.collectionSlugs.length > 0
					? data.collectionSlugs
					: undefined;
			const storeLocationFilter =
				typeof data.storeLocationId === "number"
					? data.storeLocationId
					: undefined;
			const attributeFilters = data.attributeFilters || {};
			const minPriceFilter =
				typeof data.minPrice === "number" ? data.minPrice : undefined;
			const maxPriceFilter =
				typeof data.maxPrice === "number" ? data.maxPrice : undefined;
			const sort = data.sort;

			// Calculate pagination if provided
			const hasPagination =
				typeof page === "number" && typeof pageLimit === "number";
			const offsetValue = hasPagination ? (page - 1) * pageLimit : 0;

			// Build where clause (always filter by isActive, plus search + filters)
			const conditions: SQL[] = [eq(products.isActive, true)];

			// Store FTS result IDs for filtering and ordering (execute FTS5 query once)
			let ftsProductIds: number[] | undefined;

			if (effectiveSearch) {
				// Use FTS5 for all searches (trigram tokenizer requires 3+ chars)
				const ftsQuery = buildFts5Query(effectiveSearch, {
					enablePrefixMatch: true,
					operator: "AND",
				});

				if (ftsQuery) {
					// Execute FTS5 query ONCE to get both IDs and ranking
					try {
						const ftsResults = await db.all<{ rowid: number; rank: number }>(
							sql`SELECT rowid, rank FROM products_fts WHERE products_fts MATCH ${ftsQuery} ORDER BY rank`,
						);

						ftsProductIds = ftsResults.map((r) => r.rowid);

						if (ftsProductIds.length > 0) {
							// Use pure Drizzle inArray for WHERE clause (no subquery!)
							conditions.push(inArray(products.id, ftsProductIds));
						} else {
							// No FTS results, exclude all products
							conditions.push(sql`1 = 0`);
						}
					} catch (error) {
						console.error("FTS5 search error:", error);
						// If FTS5 fails completely, exclude all products (shouldn't happen in production)
						conditions.push(sql`1 = 0`);
					}
				} else {
					// Search term too short (< 3 chars), exclude all products
					// Minimum 3 characters required for FTS5 trigram tokenizer
					conditions.push(sql`1 = 0`);
				}
			}
			if (categoryFilter) {
				conditions.push(eq(products.categorySlug, categoryFilter));
			}
			if (brandFilters) {
				conditions.push(sql`EXISTS (
				SELECT 1 FROM ${productBrands}
				WHERE ${productBrands.productId} = ${products.id}
				  AND ${productBrands.brandSlug} IN (${sql.join(brandFilters, sql`, `)})
			)`);
			}
			if (collectionFilters) {
				conditions.push(sql`EXISTS (
				SELECT 1 FROM ${productCollections}
				WHERE ${productCollections.productId} = ${products.id}
				  AND ${productCollections.collectionSlug} IN (${sql.join(collectionFilters, sql`, `)})
			)`);
			}

			// Handle store location filter using EXISTS subquery (single query, more efficient)
			if (storeLocationFilter !== undefined) {
				conditions.push(sql`EXISTS (
					SELECT 1 FROM ${productStoreLocations}
					WHERE ${productStoreLocations.productId} = ${products.id}
					  AND ${productStoreLocations.storeLocationId} = ${storeLocationFilter}
				)`);
			}

			// Handle attribute filters using junction table (SQL-based, much faster!)
			if (Object.keys(attributeFilters).length > 0) {
				for (const [attrIdStr, valueIdStrs] of Object.entries(
					attributeFilters,
				)) {
					const attrId = parseInt(attrIdStr, 10);
					const valueIds = valueIdStrs.map((id) => parseInt(id, 10));

					// For each attribute filter, add EXISTS subquery
					conditions.push(sql`EXISTS (
					SELECT 1 FROM product_attribute_values pav
					WHERE pav.product_id = ${products.id}
					  AND pav.attribute_id = ${attrId}
					  AND pav.value_id IN (${sql.join(valueIds, sql`, `)})
				)`);
				}
			}

			// Base conditions for price-bounds aggregation (all filters except price)
			const baseWhereCondition = sql.join(conditions, sql` AND `);

			// Add price filter for the main products query only
			if (minPriceFilter !== undefined) {
				conditions.push(sql`${products.price} >= ${minPriceFilter}`);
			}
			if (maxPriceFilter !== undefined) {
				conditions.push(sql`${products.price} <= ${maxPriceFilter}`);
			}

			const finalWhereCondition = sql.join(conditions, sql` AND `);

			// Determine ordering (needed for main query; independent of price bounds)
			let orderSql: SQL | typeof products.name = products.name;
			if (sort === "price-asc") {
				orderSql = sql`${products.price} asc`;
			} else if (sort === "price-desc") {
				orderSql = sql`${products.price} desc`;
			} else if (sort === "newest") {
				orderSql = sql`${products.createdAt} desc`;
			} else if (sort === "oldest") {
				orderSql = sql`${products.createdAt} asc`;
			} else if (sort === "name") {
				orderSql = sql`${products.name} asc`;
			} else if (sort === "best-selling") {
				// Sort by viewCount DESC - index optimized (viewCount defaults to 0)
				orderSql = sql`${products.viewCount} desc`;
			} else if (effectiveSearch && ftsProductIds && ftsProductIds.length > 0) {
				// Use pre-fetched FTS5 ranking (no duplicate query!)
				// Build CASE statement to maintain FTS rank order from the single query we already executed
				const caseStatements = ftsProductIds
					.map((id, index) => `WHEN ${products.id.name} = ${id} THEN ${index}`)
					.join(" ");
				orderSql = sql.raw(`CASE ${caseStatements} ELSE 9999 END`);
			}

			// Price bounds: only when first page AND no price filter (client already has bounds when they applied price)
			// Run aggregation and main query in parallel to reduce latency (max of both instead of sum)
			const isFirstPage = page === 1;
			const needPriceBounds =
				isFirstPage &&
				minPriceFilter === undefined &&
				maxPriceFilter === undefined;

			const boundsPromise = needPriceBounds
				? db
						.select({
							minPrice: min(products.price),
							maxPrice: max(products.price),
						})
						.from(products)
						.where(baseWhereCondition)
						.all()
				: Promise.resolve([]);

			// Select only columns consumed by ProductCard/list views (ProductListItem type).
			// Every field here is actually read by at least one consumer.
			const productListColumns = {
				id: products.id,
				name: products.name,
				slug: products.slug,
				images: products.images,
				price: products.price,
				discount: products.discount,
				squareMetersPerPack: products.squareMetersPerPack,
				isActive: products.isActive,
				hasVariations: products.hasVariations,
				categorySlug: products.categorySlug,
				brandSlug: products.brandSlug,
				viewCount: products.viewCount,
			};

			const productsPromise =
				offsetValue !== undefined && pageLimit
					? db
							.select(productListColumns)
							.from(products)
							.where(finalWhereCondition)
							.orderBy(orderSql)
							.limit(pageLimit + 1)
							.offset(offsetValue)
							.all()
					: db
							.select(productListColumns)
							.from(products)
							.where(finalWhereCondition)
							.orderBy(orderSql)
							.all();

			const [boundsRows, pagedProducts] = await Promise.all([
				boundsPromise,
				productsPromise,
			]);

			let priceBounds: { min: number; max: number } | undefined;
			if (needPriceBounds && boundsRows.length > 0) {
				const row = boundsRows[0];
				let minVal =
					row?.minPrice != null && Number.isFinite(Number(row.minPrice))
						? Math.floor(Number(row.minPrice))
						: 0;
				let maxVal =
					row?.maxPrice != null && Number.isFinite(Number(row.maxPrice))
						? Math.ceil(Number(row.maxPrice))
						: 0;
				// When no rows match filters (null/0), fall back to global active-product bounds so the slider is usable
				if (minVal === 0 && maxVal === 0) {
					const globalRows = await db
						.select({
							minPrice: min(products.price),
							maxPrice: max(products.price),
						})
						.from(products)
						.where(eq(products.isActive, true))
						.all();
					const global = globalRows[0];
					if (
						global?.minPrice != null &&
						Number.isFinite(Number(global.minPrice)) &&
						global?.maxPrice != null &&
						Number.isFinite(Number(global.maxPrice))
					) {
						minVal = Math.floor(Number(global.minPrice));
						maxVal = Math.ceil(Number(global.maxPrice));
					}
				}
				priceBounds = { min: minVal, max: Math.max(maxVal, minVal) };
			}

			const hasNextPage =
				offsetValue !== undefined && pageLimit
					? pagedProducts.length > pageLimit
					: false;

			const pagedProductsTrimmed =
				offsetValue !== undefined && pageLimit
					? pagedProducts.slice(0, pageLimit)
					: pagedProducts;

			const productIdsWithVariations = pagedProductsTrimmed
				.filter((product) => product.hasVariations)
				.map((product) => product.id);
			const variationsByProduct = new Map<
				number,
				ProductVariationWithAttributes[]
			>();

			if (productIdsWithVariations.length > 0) {
				const variations = await db
					.select()
					.from(productVariations)
					.where(inArray(productVariations.productId, productIdsWithVariations))
					.all();

				for (const variation of variations) {
					if (!variation.productId) continue;
					if (!variationsByProduct.has(variation.productId)) {
						variationsByProduct.set(variation.productId, []);
					}

					const existing = variationsByProduct.get(variation.productId) ?? [];
					existing.push({
						...variation,
						attributes: parseVariationAttributes(variation.variationAttributes),
					});
					variationsByProduct.set(variation.productId, existing);
				}
			}

			const productsArray = pagedProductsTrimmed.map((product) => ({
				...product,
				variations: variationsByProduct.get(product.id) || [],
			}));

			const result: {
				products: typeof productsArray;
				pagination?: {
					page: number;
					limit: number;
					hasNextPage: boolean;
					hasPreviousPage: boolean;
				};
				priceBounds?: { min: number; max: number };
			} = {
				products: productsArray,
			};
			if (priceBounds) result.priceBounds = priceBounds;

			// Add pagination info if pagination was used
			if (
				page !== undefined &&
				pageLimit !== undefined &&
				offsetValue !== undefined
			) {
				const hasPreviousPage = page > 1;
				result.pagination = {
					page,
					limit: pageLimit,
					hasNextPage,
					hasPreviousPage,
				};
				return result;
			}

			return result;
		} catch (error) {
			console.error("Error fetching store data:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch store data");
		}
	});
