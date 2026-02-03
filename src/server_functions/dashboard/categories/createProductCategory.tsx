import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { categories } from "~/schema";
import type { CategoryFormData } from "~/types";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const createProductCategory = createServerFn({ method: "POST" })
	.inputValidator((data: CategoryFormData) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const categoryData = data;

			if (!categoryData.name || !categoryData.slug) {
				setResponseStatus(400);
				throw new Error("Missing required fields: name and slug are required");
			}

			// Check for duplicate slug
			const existingCategory = await db
				.select({ slug: categories.slug })
				.from(categories)
				.where(eq(categories.slug, categoryData.slug))
				.limit(1);

			if (existingCategory.length > 0) {
				setResponseStatus(409);
				throw new Error("A category with this slug already exists");
			}

			// Move staging images to final location before saving (in same request)
			let finalImage = categoryData.image || "";
			if (finalImage?.startsWith("staging/")) {
				const bucket = getStorageBucket();
				const moveResult = await moveStagingImagesWithBucket(bucket, {
					imagePaths: [finalImage],
					finalFolder: "categories",
					slug: categoryData.slug,
					productName: categoryData.name,
				});

				if (moveResult?.pathMap?.[finalImage]) {
					finalImage = moveResult.pathMap[finalImage];
				} else if (moveResult?.movedImages && moveResult.movedImages.length > 0) {
					finalImage = moveResult.movedImages[0];
				}
			}

			const insertResult = await db
				.insert(categories)
				.values({
					name: categoryData.name,
					slug: categoryData.slug,
					parentSlug: categoryData.parentSlug || null,
					image: finalImage || null,
					isActive: categoryData.isActive ?? true,
					order: categoryData.order ?? 0,
				})
				.returning();

			return {
				message: "Category created successfully",
				category: insertResult[0],
			};
		} catch (error) {
			console.error("Error creating category:", error);
			setResponseStatus(500);
			throw new Error("Failed to create category");
		}
	});
