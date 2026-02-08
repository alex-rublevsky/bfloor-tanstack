import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { productStoreLocations, products, productVariations } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import {
	parseProductAttributes,
	parseVariationAttributes,
} from "~/utils/productParsing";

export const getProductBySlug = createServerFn({ method: "GET" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const productId = data.id;

			if (Number.isNaN(productId)) {
				throw new ApiError("Invalid product ID", 400);
			}

			// Fetch product
			const productResult = await db
				.select()
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);

			if (!productResult[0]) {
				throw new ApiError("Product not found", 404);
			}

			const product = productResult[0];

			// Fetch store locations separately (more reliable than subquery)
			const storeLocationResults = await db
				.select({
					storeLocationId: productStoreLocations.storeLocationId,
				})
				.from(productStoreLocations)
				.where(eq(productStoreLocations.productId, productId));

			// Fetch variations only if hasVariations = true
			const variationsResult = product.hasVariations
				? await db
						.select()
						.from(productVariations)
						.where(eq(productVariations.productId, productId))
				: [];

			// Parse store location IDs from separate query
			const storeLocationIds: number[] = storeLocationResults
				.map((row) => row.storeLocationId)
				.filter((id): id is number => id !== null && !Number.isNaN(id));

			// Parse variations with their attributes from JSON (dual storage pattern)
			const variations = variationsResult.map((row) => {
				const attributes = parseVariationAttributes(row.variationAttributes);

				return {
					id: row.id.toString(),
					sku: row.sku,
					price: row.price,
					sort: row.sort,
					discount: row.discount,
					attributes: attributes,
				};
			});

			// Parse productAttributes - now standardized as array format
			const productAttributesArray = parseProductAttributes(
				product.productAttributes,
			);

			// Store location IDs already parsed from main query

			const productWithDetails = {
				id: product.id,
				name: product.name,
				slug: product.slug,
				sku: product.sku,
				images: product.images,
				description: product.description,
				importantNote: product.importantNote,
				tags: product.tags,
				price: product.price,
				squareMetersPerPack: product.squareMetersPerPack,
				unitOfMeasurement: product.unitOfMeasurement,
				isActive: product.isActive,
				isFeatured: product.isFeatured,
				discount: product.discount,
				hasVariations: product.hasVariations,
				categorySlug: product.categorySlug,
				brandSlug: product.brandSlug,
				collectionSlug: product.collectionSlug,
				createdAt: product.createdAt,
				dimensions: product.dimensions,
				productAttributes: productAttributesArray,
				variations,
				storeLocationIds, // Add store location IDs for convenience
			};

			return productWithDetails;
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error fetching product:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
