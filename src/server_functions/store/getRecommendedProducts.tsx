import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { inArray, sql } from "drizzle-orm";
import { DB } from "~/db";
import { products, productVariations } from "~/schema";
import { parseVariationAttributes } from "~/utils/productParsing";

/**
 * Get recommended (featured) products
 *
 * This is a dedicated server function for recommended products that:
 * - Only fetches featured products (isFeatured = true)
 * - Optimized for static/cached data (changes rarely - once a year)
 * - Returns all recommended products (supports pagination for infinite scroll)
 * - Uses extreme caching (30 days) via TanStack Query
 *
 * Note: This function is optimized for rarely-changing data. It uses aggressive
 * client-side caching (30 days) instead of build-time static generation, which
 * works better with Cloudflare Workers SSR architecture.
 */
export const getRecommendedProducts = createServerFn({ method: "GET" })
	.inputValidator((data: { page?: number; limit?: number } = {}) => data)
	.handler(async ({ data = {} }) => {
		try {
			const db = DB();
			const { page = 1, limit: pageLimit = 20 } = data;
			const offsetValue = (page - 1) * pageLimit;

			// Build where clause: only active and featured products
			const whereCondition = sql`${products.isActive} = 1 AND ${products.isFeatured} = 1`;

			// Select only columns consumed by ProductCard/list views (ProductListItem type).
			const productListColumns = {
				id: products.id,
				name: products.name,
				slug: products.slug,
				images: products.images,
				price: products.price,
				discount: products.discount,
				isActive: products.isActive,
				hasVariations: products.hasVariations,
				categorySlug: products.categorySlug,
				brandSlug: products.brandSlug,
				viewCount: products.viewCount,
			};

			// Fetch products ordered by name (consistent ordering for caching)
			const productsResult = await db
				.select(productListColumns)
				.from(products)
				.where(whereCondition)
				.orderBy(products.name)
				.limit(pageLimit + 1)
				.offset(offsetValue)
				.all();

			if (productsResult.length === 0) {
				return {
					products: [],
					pagination: {
						page,
						limit: pageLimit,
						hasNextPage: false,
						hasPreviousPage: false,
					},
				};
			}

			const hasNextPage = productsResult.length > pageLimit;
			const pagedProducts = productsResult.slice(0, pageLimit);

			const productIdsWithVariations = pagedProducts
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

			const productsArray = pagedProducts.map((product) => {
				const variations = variationsByProduct.get(product.id) || [];
				const variationsArray = variations
					.map((variation) => ({
						...variation,
						attributes: parseVariationAttributes(variation.variationAttributes),
					}))
					.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

				return {
					...product,
					variations: variationsArray,
				};
			});

			return {
				products: productsArray,
				pagination: {
					page,
					limit: pageLimit,
					hasNextPage,
					hasPreviousPage: page > 1,
				},
			};
		} catch (error) {
			console.error("Error fetching recommended products:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch recommended products");
		}
	});
