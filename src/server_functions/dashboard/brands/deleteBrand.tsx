import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { brands, collections, products } from "~/schema";
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
				.select({ id: brands.id, slug: brands.slug, image: brands.image })
				.from(brands)
				.where(eq(brands.id, id))
				.limit(1);

			if (existingBrand.length === 0) {
				throw new ApiError("Brand not found", 404);
			}

			// Check if any products are using this brand
			const productsUsingBrand = await db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.brandSlug, existingBrand[0].slug))
				.limit(1);

			if (productsUsingBrand.length > 0) {
				throw new ApiError(
					"Cannot delete brand: there are products using this brand",
					409,
				);
			}

			// Check if any collections belong to this brand
			// collections.brandSlug has onDelete: "cascade", so they'd be silently deleted
			const collectionsUsingBrand = await db
				.select({ id: collections.id })
				.from(collections)
				.where(eq(collections.brandSlug, existingBrand[0].slug))
				.limit(1);

			if (collectionsUsingBrand.length > 0) {
				throw new ApiError(
					"Cannot delete brand: there are collections belonging to this brand",
					409,
				);
			}

			// Delete the brand logo from R2 if it exists
			const brandLogo = existingBrand[0].image;
			if (brandLogo && !brandLogo.startsWith("staging/")) {
				try {
					const bucket = getStorageBucket();
					console.log("🗑️ Deleting brand logo from R2:", brandLogo);
					await bucket.delete(brandLogo);
					console.log("✅ Brand logo deleted from R2 successfully");
				} catch (deleteError) {
					console.warn("⚠️ Failed to delete brand logo from R2:", deleteError);
					// Don't fail the brand deletion if logo deletion fails
				}
			}

			// Delete the brand
			const deleteResult = await db
				.delete(brands)
				.where(eq(brands.id, id))
				.returning();

			if (deleteResult.length === 0) {
				setResponseStatus(404);
				throw new Error("Brand not found");
			}

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
