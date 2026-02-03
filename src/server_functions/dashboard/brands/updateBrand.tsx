import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { brands } from "~/schema";
import type { BrandFormData } from "~/types";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const updateBrand = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; data: BrandFormData }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id, data: brandData } = data;

			if (!brandData.name || !brandData.slug) {
				setResponseStatus(400);
				throw new Error("Missing required fields: name and slug are required");
			}

			// Check for duplicate slug (excluding current brand)
			const existingBrand = await db
				.select({ slug: brands.slug })
				.from(brands)
				.where(eq(brands.slug, brandData.slug))
				.limit(1);

			if (existingBrand.length > 0) {
				// Check if it's the same brand (same ID)
				const currentBrand = await db
					.select({ id: brands.id })
					.from(brands)
					.where(eq(brands.id, id))
					.limit(1);

				if (currentBrand.length === 0) {
					setResponseStatus(404);
					throw new Error("Brand not found");
				}

				if (existingBrand[0].slug !== brandData.slug) {
					setResponseStatus(409);
					throw new Error("A brand with this slug already exists");
				}
			}

			// Move staging images to final location before saving (in same request)
			let finalLogo = brandData.logo || "";
			if (finalLogo?.startsWith("staging/")) {
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

			// Update the brand
			const updateResult = await db
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

			if (updateResult.length === 0) {
				setResponseStatus(404);
				throw new Error("Brand not found");
			}

			return {
				message: "Brand updated successfully",
				brand: updateResult[0],
			};
		} catch (error) {
			console.error("Error updating brand:", error);
			setResponseStatus(500);
			throw new Error("Failed to update brand");
		}
	});
