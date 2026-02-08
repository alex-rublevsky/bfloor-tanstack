import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { categories, products } from "~/schema";
import type { CategoryFormData } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const updateProductCategory = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; data: CategoryFormData }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id, data: categoryData } = data;

			if (Number.isNaN(id)) {
				throw new ApiError("Invalid category ID", 400);
			}

			if (!categoryData.name || !categoryData.slug) {
				throw new ApiError(
					"Missing required fields: name and slug are required",
					400,
				);
			}

			// Check if category exists
			const existingCategory = await db
				.select()
				.from(categories)
				.where(eq(categories.id, id))
				.limit(1);

			if (existingCategory.length === 0) {
				throw new ApiError("Category not found", 404);
			}

			// If slug is being changed, check for duplicate
			if (existingCategory[0].slug !== categoryData.slug) {
				const duplicateCheck = await db
					.select({ slug: categories.slug })
					.from(categories)
					.where(eq(categories.slug, categoryData.slug))
					.limit(1);

				if (duplicateCheck.length > 0) {
					throw new ApiError("A category with this slug already exists", 409);
				}
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
				} else if (
					moveResult?.movedImages &&
					moveResult.movedImages.length > 0
				) {
					finalImage = moveResult.movedImages[0];
				}
			}

			const oldSlug = existingCategory[0].slug;
			const slugChanged = oldSlug !== categoryData.slug;

			// Update category + propagate slug changes in a single transaction
			const updateResult = await db.transaction(async (tx) => {
				const result = await tx
					.update(categories)
					.set({
						name: categoryData.name,
						slug: categoryData.slug,
						parentSlug: categoryData.parentSlug || null,
						image: finalImage || null,
						isActive: categoryData.isActive ?? true,
						order: categoryData.order ?? 0,
					})
					.where(eq(categories.id, id))
					.returning();

				// Propagate slug change to products
				if (slugChanged) {
					await tx
						.update(products)
						.set({ categorySlug: categoryData.slug })
						.where(eq(products.categorySlug, oldSlug));

					// Also update any child categories referencing this slug as parentSlug
					await tx
						.update(categories)
						.set({ parentSlug: categoryData.slug })
						.where(eq(categories.parentSlug, oldSlug));
				}

				return result;
			});

			return {
				message: "Category updated successfully",
				category: updateResult[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating category:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
