import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray, type SQL, sql } from "drizzle-orm";
import { DB } from "~/db";
import {
	productBrands,
	productCollections,
	productStoreLocations,
	products,
	productVariations,
} from "~/schema";
import { parseVariationAttributes } from "~/utils/productParsing";
import { buildFts5Query } from "~/utils/search/queryExpander";

export const getAllProducts = createServerFn({ method: "GET" })
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
				tag?: string;
				hasDiscount?: boolean;
				isFeatured?: boolean;
				productIds?: number[]; // Filter by specific product IDs
				sort?:
					| "relevant"
					| "name"
					| "price-asc"
					| "price-desc"
					| "newest"
					| "oldest"
					| "best-selling"
					| "views-asc"
					| "category-asc"
					| "category-desc"
					| "brand-asc"
					| "brand-desc";
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
			const tagFilter = data.tag && data.tag.length > 0 ? data.tag : undefined;
			const hasDiscountFilter = data.hasDiscount === true;
			const isFeaturedFilter = data.isFeatured === true;
			const productIdsFilter =
				Array.isArray(data.productIds) && data.productIds.length > 0
					? data.productIds
					: undefined;
			const sort = data.sort;

			// Calculate pagination if provided
			const hasPagination =
				typeof page === "number" && typeof pageLimit === "number";
			const offsetValue = hasPagination ? (page - 1) * pageLimit : 0;

			// Build where clause (search + filters)
			const conditions: SQL[] = [];

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
			if (minPriceFilter !== undefined) {
				conditions.push(sql`${products.price} >= ${minPriceFilter}`);
			}
			if (maxPriceFilter !== undefined) {
				conditions.push(sql`${products.price} <= ${maxPriceFilter}`);
			}
			if (tagFilter) {
				// Filter products where tags JSON array contains the tag
				// Using LIKE for simplicity (matches JSON array format: ["tag1","tag2"])
				conditions.push(sql`${products.tags} LIKE ${`%"${tagFilter}"%`}`);
			}
			if (hasDiscountFilter) {
				// Filter products where discount is not null and greater than 0
				conditions.push(
					sql`${products.discount} IS NOT NULL AND ${products.discount} > 0`,
				);
			}
			if (isFeaturedFilter) {
				// Filter products where isFeatured is true
				conditions.push(eq(products.isFeatured, true));
			}
			if (productIdsFilter) {
				// Filter products by specific IDs
				conditions.push(inArray(products.id, productIdsFilter));
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

			const finalWhereCondition =
				conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`1=1`;

			// Determine ordering
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
			} else if (sort === "views-asc") {
				orderSql = sql`${products.viewCount} asc`;
			} else if (sort === "category-asc") {
				orderSql = sql`${products.categorySlug} asc, ${products.name} asc`;
			} else if (sort === "category-desc") {
				orderSql = sql`${products.categorySlug} desc, ${products.name} asc`;
			} else if (sort === "brand-asc") {
				orderSql = sql`${products.brandSlug} asc, ${products.name} asc`;
			} else if (sort === "brand-desc") {
				orderSql = sql`${products.brandSlug} desc, ${products.name} asc`;
			} else if (effectiveSearch && ftsProductIds && ftsProductIds.length > 0) {
				// Use pre-fetched FTS5 ranking (no duplicate query!)
				// Build CASE statement to maintain FTS rank order from the single query we already executed
				const caseStatements = ftsProductIds
					.map((id, index) => `WHEN ${products.id.name} = ${id} THEN ${index}`)
					.join(" ");
				orderSql = sql.raw(`CASE ${caseStatements} ELSE 9999 END`);
			}

			// Select only columns consumed by ProductCard/dashboard table (ProductListItem type).
			// Every field here is actually read by at least one consumer.
			const listColumns = {
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

			// Fetch products first (no join) to avoid row explosion from variations
			const pagedProducts =
				offsetValue !== undefined && pageLimit
					? await db
							.select(listColumns)
							.from(products)
							.where(finalWhereCondition)
							.orderBy(orderSql)
							.limit(pageLimit + 1)
							.offset(offsetValue)
							.all()
					: await db
							.select(listColumns)
							.from(products)
							.where(finalWhereCondition)
							.orderBy(orderSql)
							.all();

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
				(typeof productVariations.$inferSelect)[]
			>();

			if (productIdsWithVariations.length > 0) {
				const variations = await db
					.select()
					.from(productVariations)
					.where(inArray(productVariations.productId, productIdsWithVariations))
					.all();

				for (const variation of variations) {
					if (!variation.productId) continue;
					const existing = variationsByProduct.get(variation.productId) ?? [];
					existing.push(variation);
					variationsByProduct.set(variation.productId, existing);
				}
			}

			const productsArray = pagedProductsTrimmed.map((product) => {
				const variations = variationsByProduct.get(product.id) || [];
				const variationsWithAttributes = variations
					.map((variation) => ({
						...variation,
						attributes: parseVariationAttributes(variation.variationAttributes),
					}))
					.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

				return {
					...product,
					// Keep images as JSON string - parseImages() in ProductCard will handle parsing
					images: product.images || "",
					variations: variationsWithAttributes,
				};
			});

			const result = {
				products: productsArray,
			};

			// Add pagination info if pagination was used
			if (hasPagination && page !== undefined && pageLimit !== undefined) {
				const hasPreviousPage = page > 1;

				return {
					...result,
					pagination: {
						page,
						limit: pageLimit,
						hasNextPage,
						hasPreviousPage,
					},
				};
			}

			return {
				...result,
				pagination: {
					page: 1,
					limit: productsArray.length,
					hasNextPage: false,
					hasPreviousPage: false,
				},
			};
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
			console.error(
				"Error stack:",
				error instanceof Error ? error.stack : "No stack trace",
			);
			console.error("Error details:", {
				message: error instanceof Error ? error.message : String(error),
				name: error instanceof Error ? error.name : "Unknown",
			});
			setResponseStatus(500);
			throw new Error(
				`Failed to fetch dashboard data: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});
