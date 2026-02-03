import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { inArray } from "drizzle-orm";
import { DB } from "~/db";
import { products, productVariations, variationAttributes } from "~/schema";
import { getStorageBucket } from "~/utils/storage";
import { getProductImageStorageKey } from "./moveStagingImages";

export const bulkDeleteProducts = createServerFn({ method: "POST" })
	.inputValidator((data: { ids: number[] }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const productIds = data.ids;

			if (!productIds || productIds.length === 0) {
				setResponseStatus(400);
				throw new Error("No product IDs provided");
			}

			// Validate all IDs are numbers
			if (productIds.some((id) => Number.isNaN(id))) {
				setResponseStatus(400);
				throw new Error("Invalid product ID(s)");
			}

			// Get all products to delete
			const productsToDelete = await db
				.select()
				.from(products)
				.where(inArray(products.id, productIds));

			if (productsToDelete.length === 0) {
				setResponseStatus(404);
				throw new Error("No products found");
			}

			// Delete images from R2 for all products
			const bucket = getStorageBucket();
			await Promise.all(
				productsToDelete.map(async (product) => {
					if (!product.images) return;

					try {
						let imageArray: string[] = [];
						try {
							imageArray = JSON.parse(product.images);
						} catch {
							imageArray = product.images
								.split(",")
								.map((img) => img.trim())
								.filter(Boolean);
						}

						if (imageArray.length > 0) {
							await Promise.all(
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
						console.warn(
							`Failed to delete images for product ${product.id}:`,
							error,
						);
					}
				}),
			);

			// Get all variation IDs for these products
			const existingVariations = await db
				.select({ id: productVariations.id })
				.from(productVariations)
				.where(inArray(productVariations.productId, productIds));

			const variationIds = existingVariations.map((variation) => variation.id);

			// Delete variation attributes in a single query
			if (variationIds.length > 0) {
				await db
					.delete(variationAttributes)
					.where(inArray(variationAttributes.productVariationId, variationIds));

				// Delete variations
				await db
					.delete(productVariations)
					.where(inArray(productVariations.productId, productIds));
			}

			// Finally delete all products
			await db.delete(products).where(inArray(products.id, productIds));

			return {
				message: `${productsToDelete.length} product${productsToDelete.length === 1 ? "" : "s"} deleted successfully`,
				deletedCount: productsToDelete.length,
			};
		} catch (error) {
			console.error("Error bulk deleting products:", error);
			setResponseStatus(500);
			throw new Error("Failed to delete products");
		}
	});
