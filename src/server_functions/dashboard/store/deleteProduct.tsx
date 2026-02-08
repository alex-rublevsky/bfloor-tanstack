import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
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

export const deleteProduct = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const productId = data.id;

			if (Number.isNaN(productId)) {
				throw new ApiError("Invalid product ID", 400);
			}

			// Check product existence and order references in parallel
			const [existingProduct, existingOrderItems] = await Promise.all([
				db
					.select({ id: products.id, images: products.images })
					.from(products)
					.where(eq(products.id, productId))
					.limit(1),
				db
					.select({ id: orderItems.id })
					.from(orderItems)
					.where(eq(orderItems.productId, productId))
					.limit(1),
			]);

			if (!existingProduct[0]) {
				throw new ApiError("Product not found", 404);
			}

			if (existingOrderItems.length > 0) {
				throw new ApiError(
					"Cannot delete product: it has existing orders. Deactivate it instead.",
					409,
				);
			}

			// === Delete images from storage (outside transaction — storage I/O) ===
			if (existingProduct[0].images) {
				try {
					let imageArray: string[] = [];
					try {
						imageArray = JSON.parse(existingProduct[0].images);
					} catch {
						imageArray = existingProduct[0].images
							.split(",")
							.map((img) => img.trim())
							.filter(Boolean);
					}

					if (imageArray.length > 0) {
						const bucket = getStorageBucket();
						await Promise.allSettled(
							imageArray.map(async (imagePath) => {
								try {
									const storageKey = getProductImageStorageKey(imagePath);
									await bucket.delete(storageKey);
								} catch (error) {
									console.warn(`Failed to delete image ${imagePath}:`, error);
								}
							}),
						);
					}
				} catch (error) {
					console.warn("Failed to delete images from storage:", error);
				}
			}

			// === All DB deletes in a single transaction ===
			await db.transaction(async (tx) => {
				// Get variation IDs for cleanup
				const existingVariations = await tx
					.select({ id: productVariations.id })
					.from(productVariations)
					.where(eq(productVariations.productId, productId));

				const variationIds = existingVariations.map((v) => v.id);

				// Delete variation attributes + variations
				if (variationIds.length > 0) {
					await tx
						.delete(variationAttributes)
						.where(
							inArray(variationAttributes.productVariationId, variationIds),
						);
					await tx
						.delete(productVariations)
						.where(eq(productVariations.productId, productId));
				}

				// Delete all junction table entries
				await Promise.all([
					tx
						.delete(productBrands)
						.where(eq(productBrands.productId, productId)),
					tx
						.delete(productCollections)
						.where(eq(productCollections.productId, productId)),
					tx
						.delete(productStoreLocations)
						.where(eq(productStoreLocations.productId, productId)),
					tx
						.delete(productAttributeValues)
						.where(eq(productAttributeValues.productId, productId)),
				]);

				// Finally delete the product itself
				await tx.delete(products).where(eq(products.id, productId));
			});

			return {
				message: "Product deleted successfully",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting product:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
