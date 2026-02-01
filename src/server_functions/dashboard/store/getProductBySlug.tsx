import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, sql } from "drizzle-orm";
import { DB } from "~/db";
import { productStoreLocations, products, productVariations } from "~/schema";
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
				setResponseStatus(400);
				throw new Error("Invalid product ID");
			}

			// Fetch product with store locations in main query (all products have store locations)
			const productResult = await db
				.select({
					products: products,
					storeLocationIds: sql<string | null>`(
						SELECT GROUP_CONCAT(${productStoreLocations.storeLocationId})
						FROM ${productStoreLocations}
						WHERE ${productStoreLocations.productId} = ${products.id}
					)`,
				})
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);

			if (!productResult[0]) {
				setResponseStatus(404);
				throw new Error("Product not found");
			}

			const product = productResult[0].products;

			// Fetch variations only if hasVariations = true
			const variationsResult = product.hasVariations
				? await db
						.select()
						.from(productVariations)
						.where(eq(productVariations.productId, productId))
				: [];

			// Parse store location IDs from comma-separated string (all products have store locations)
			const storeLocationIds: number[] = productResult[0].storeLocationIds
				? productResult[0].storeLocationIds
						.split(",")
						.map((id) => parseInt(id, 10))
						.filter((id): id is number => !Number.isNaN(id))
				: [];

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
				storeLocationId: product.storeLocationId,
				createdAt: product.createdAt,
				dimensions: product.dimensions,
				productAttributes: productAttributesArray,
				variations,
				storeLocationIds, // Add store location IDs for convenience
			};

			return productWithDetails;
		} catch (error) {
			console.error("Error fetching product:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch product");
		}
	});
