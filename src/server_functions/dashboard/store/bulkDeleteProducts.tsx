import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { inArray } from "drizzle-orm";
import { DB } from "~/db";
import {
	orderItems,
	productAttributeValues,
	productBrands,
	productCollections,
	productStoreLocations,
	products,
	productVariations,
	variationAttributes,
} from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { getProductImageStorageKey } from "./moveStagingImages";

export const bulkDeleteProducts = createServerFn({ method: "POST" })
	.inputValidator((data: { ids: number[] }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const productIds = data.ids;

			if (!productIds || productIds.length === 0) {
				throw new ApiError("No product IDs provided", 400);
			}

			if (productIds.some((id) => Number.isNaN(id))) {
				throw new ApiError("Invalid product ID(s)", 400);
			}

			// Check product existence and order references in parallel
			const [productsToDelete, productsWithOrders] = await Promise.all([
				db
					.select({ id: products.id, images: products.images })
					.from(products)
					.where(inArray(products.id, productIds)),
				db
					.select({ productId: orderItems.productId })
					.from(orderItems)
					.where(inArray(orderItems.productId, productIds))
					.groupBy(orderItems.productId),
			]);

			if (productsToDelete.length === 0) {
				throw new ApiError("No products found", 404);
			}

			if (productsWithOrders.length > 0) {
				const blockedIds = productsWithOrders.map((o) => o.productId);
				throw new ApiError(
					`Cannot delete ${blockedIds.length} product(s) that have existing orders (IDs: ${blockedIds.join(", ")}). Deactivate them instead.`,
					409,
				);
			}

			// Delete images from R2 for all products (outside transaction — storage I/O)
			const bucket = getStorageBucket();
			await Promise.allSettled(
				productsToDelete.flatMap((product) => {
					if (!product.images) return [];

					let imageArray: string[] = [];
					try {
						imageArray = JSON.parse(product.images);
					} catch {
						imageArray = product.images
							.split(",")
							.map((img) => img.trim())
							.filter(Boolean);
					}

					return imageArray.map(async (imagePath) => {
						try {
							const storageKey = getProductImageStorageKey(imagePath);
							await bucket.delete(storageKey);
						} catch (error) {
							console.warn(`Failed to delete image ${imagePath}:`, error);
						}
					});
				}),
			);

			// All DB deletes in a single transaction
			await db.transaction(async (tx) => {
				// Get all variation IDs for these products
				const existingVariations = await tx
					.select({ id: productVariations.id })
					.from(productVariations)
					.where(inArray(productVariations.productId, productIds));

				const variationIds = existingVariations.map((v) => v.id);

				// Delete variation attributes
				if (variationIds.length > 0) {
					await tx
						.delete(variationAttributes)
						.where(
							inArray(variationAttributes.productVariationId, variationIds),
						);
				}

				// Delete all dependent rows in parallel
				await Promise.all([
					// Variations
					tx
						.delete(productVariations)
						.where(inArray(productVariations.productId, productIds)),
					// Junction tables
					tx
						.delete(productBrands)
						.where(inArray(productBrands.productId, productIds)),
					tx
						.delete(productCollections)
						.where(inArray(productCollections.productId, productIds)),
					tx
						.delete(productStoreLocations)
						.where(inArray(productStoreLocations.productId, productIds)),
					tx
						.delete(productAttributeValues)
						.where(inArray(productAttributeValues.productId, productIds)),
				]);

				// Finally delete all products
				await tx.delete(products).where(inArray(products.id, productIds));
			});

			return {
				message: `${productsToDelete.length} product${productsToDelete.length === 1 ? "" : "s"} deleted successfully`,
				deletedCount: productsToDelete.length,
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error bulk deleting products:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
