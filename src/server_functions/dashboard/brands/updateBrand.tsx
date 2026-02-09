import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { brands, collections, productBrands, products } from "~/schema";
import type { BrandFormData } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const updateBrand = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; data: BrandFormData }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id, data: brandData } = data;

			if (!brandData.name || !brandData.slug) {
				throw new ApiError(
					"Missing required fields: name and slug are required",
					400,
				);
			}

			// Check if brand exists
			const currentBrand = await db
				.select({ id: brands.id, slug: brands.slug })
				.from(brands)
				.where(eq(brands.id, id))
				.limit(1);

			if (currentBrand.length === 0) {
				throw new ApiError("Brand not found", 404);
			}

			// If slug is being changed, check for duplicate
			if (currentBrand[0].slug !== brandData.slug) {
				const duplicateSlug = await db
					.select({ slug: brands.slug })
					.from(brands)
					.where(eq(brands.slug, brandData.slug))
					.limit(1);

				if (duplicateSlug.length > 0) {
					throw new ApiError("A brand with this slug already exists", 409);
				}
			}

			// Move staging images to final location before saving (in same request)
			let finalLogo = brandData.logo || "";
			if (finalLogo?.startsWith("images/staging/")) {
				const bucket = getStorageBucket();
				const moveResult = await moveStagingImagesWithBucket(bucket, {
					imagePaths: [finalLogo],
					finalFolder: "brands",
					slug: brandData.slug,
					productName: brandData.name,
				});

				if (moveResult?.pathMap?.[finalLogo]) {
					finalLogo = moveResult.pathMap[finalLogo];
				} else if (
					moveResult?.movedImages &&
					moveResult.movedImages.length > 0
				) {
					finalLogo = moveResult.movedImages[0];
				}
			}

			const oldSlug = currentBrand[0].slug;
			const slugChanged = oldSlug !== brandData.slug;

			// Update brand + propagate slug changes in a single transaction
			const updateResult = await db.transaction(async (tx) => {
				const result = await tx
					.update(brands)
					.set({
						name: brandData.name,
						slug: brandData.slug,
						image: finalLogo || null,
						countryId: brandData.countryId || null,
						isActive: brandData.isActive ?? true,
					})
					.where(eq(brands.id, id))
					.returning();

				if (result.length === 0) {
					throw new ApiError("Brand not found", 404);
				}

				// Propagate slug change to all referencing tables
				if (slugChanged) {
					await Promise.all([
						tx
							.update(products)
							.set({ brandSlug: brandData.slug })
							.where(eq(products.brandSlug, oldSlug)),
						tx
							.update(productBrands)
							.set({ brandSlug: brandData.slug })
							.where(eq(productBrands.brandSlug, oldSlug)),
						tx
							.update(collections)
							.set({ brandSlug: brandData.slug })
							.where(eq(collections.brandSlug, oldSlug)),
					]);
				}

				return result;
			});

			return {
				message: "Brand updated successfully",
				brand: updateResult[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating brand:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
