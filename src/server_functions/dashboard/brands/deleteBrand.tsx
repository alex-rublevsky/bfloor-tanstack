import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { brands, collections, productBrands, products } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";

export const deleteBrand = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id } = data;

			// Check if brand exists and get its logo
			const existingBrand = await db
				.select({
					id: brands.id,
					slug: brands.slug,
					image: brands.image,
				})
				.from(brands)
				.where(eq(brands.id, id))
				.limit(1);

			if (existingBrand.length === 0) {
				throw new ApiError("Brand not found", 404);
			}

			const brandSlug = existingBrand[0].slug;

			// Check products and collections in parallel (independent queries)
			const [productsUsingBrand, collectionsUsingBrand] = await Promise.all([
				db
					.select({ id: products.id })
					.from(products)
					.where(eq(products.brandSlug, brandSlug))
					.limit(1),
				db
					.select({ id: collections.id })
					.from(collections)
					.where(eq(collections.brandSlug, brandSlug))
					.limit(1),
			]);

			if (productsUsingBrand.length > 0) {
				throw new ApiError(
					"Cannot delete brand: there are products using this brand",
					409,
				);
			}

			if (collectionsUsingBrand.length > 0) {
				throw new ApiError(
					"Cannot delete brand: there are collections belonging to this brand",
					409,
				);
			}

			// Delete the brand logo from R2 if it exists (outside transaction — storage I/O)
			const brandLogo = existingBrand[0].image;
			if (brandLogo && !brandLogo.startsWith("staging/")) {
				try {
					const bucket = getStorageBucket();
					await bucket.delete(brandLogo);
				} catch (deleteError) {
					console.warn("Failed to delete brand logo from R2:", deleteError);
				}
			}

			// Delete brand + clean up orphaned junction rows in a transaction
			await db.transaction(async (tx) => {
				// Clean up any orphaned productBrands rows referencing this brand's slug
				await tx
					.delete(productBrands)
					.where(eq(productBrands.brandSlug, brandSlug));

				// Delete the brand
				const deleteResult = await tx
					.delete(brands)
					.where(eq(brands.id, id))
					.returning();

				if (deleteResult.length === 0) {
					throw new ApiError("Brand not found", 404);
				}
			});

			return {
				message: "Brand deleted successfully",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting brand:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
