import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { brands } from "~/schema";
import type { BrandFormData } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const createBrand = createServerFn({ method: "POST" })
	.inputValidator((data: BrandFormData) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const brandData = data;

			if (!brandData.name || !brandData.slug) {
				throw new ApiError(
					"Missing required fields: name and slug are required",
					400,
				);
			}

			// Check for duplicate slug
			const existingBrand = await db
				.select({ slug: brands.slug })
				.from(brands)
				.where(eq(brands.slug, brandData.slug))
				.limit(1);

			if (existingBrand.length > 0) {
				throw new ApiError("A brand with this slug already exists", 409);
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

			// Insert the brand
			const insertResult = await db
				.insert(brands)
				.values({
					name: brandData.name,
					slug: brandData.slug,
					image: finalLogo || null,
					countryId: brandData.countryId || null,
					isActive: brandData.isActive ?? true,
				})
				.returning();

			return {
				message: "Brand created successfully",
				brand: insertResult[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error creating brand:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
