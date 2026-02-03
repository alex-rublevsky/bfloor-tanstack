import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
import { DB } from "~/db";
import { products, productVariations, variationAttributes } from "~/schema";
import { getStorageBucket } from "~/utils/storage";
import { getProductImageStorageKey } from "./moveStagingImages";

export const deleteProduct = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const productId = data.id;

			if (Number.isNaN(productId)) {
				setResponseStatus(400);
				throw new Error("Invalid product ID");
			}

			// Check if product exists
			const existingProduct = await db
				.select()
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);

			if (!existingProduct[0]) {
				setResponseStatus(404);
				throw new Error("Product not found");
			}

			// Delete images from R2 if they exist
			if (existingProduct[0].images) {
				try {
					let imageArray: string[] = [];
					try {
						// Try to parse as JSON
						imageArray = JSON.parse(existingProduct[0].images);
					} catch {
						// If it's not JSON, treat it as comma-separated string
						imageArray = existingProduct[0].images
							.split(",")
							.map((img) => img.trim())
							.filter(Boolean);
					}

					if (imageArray.length > 0) {
						const bucket = getStorageBucket();
						// Delete all images associated with this product (storage key is under images/)
						await Promise.all(
							imageArray.map(async (imagePath) => {
								try {
									const storageKey = getProductImageStorageKey(imagePath);
									await bucket.delete(storageKey);
								} catch (error) {
									// Log but don't fail if image deletion fails
									console.warn(`Failed to delete image ${imagePath}:`, error);
								}
							}),
						);
					}
				} catch (error) {
					// Log but don't fail if image deletion fails
					console.warn("Failed to delete images from R2:", error);
				}
			}

			// Delete related data first (foreign key constraints)

			// Get all variation IDs for this product
			const existingVariations = await db
				.select({ id: productVariations.id })
				.from(productVariations)
				.where(eq(productVariations.productId, productId));

			const variationIds = existingVariations.map((variation) => variation.id);

			// Delete variation attributes in a single query
			if (variationIds.length > 0) {
				await db
					.delete(variationAttributes)
					.where(inArray(variationAttributes.productVariationId, variationIds));

				// Delete variations
				await db
					.delete(productVariations)
					.where(eq(productVariations.productId, productId));
			}

			// Finally delete the product
			await db.delete(products).where(eq(products.id, productId));

			return {
				message: "Product deleted successfully",
			};
		} catch (error) {
			console.error("Error deleting product:", error);
			setResponseStatus(500);
			throw new Error("Failed to delete product");
		}
	});
