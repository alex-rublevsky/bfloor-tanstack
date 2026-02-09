import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { categories, products } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { getProductImageStorageKey } from "../store/moveStagingImages";

export const deleteProductCategory = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const id = data.id;

			if (Number.isNaN(id)) {
				throw new ApiError("Invalid category ID", 400);
			}

			// Check if category exists (only fetch needed columns)
			const existingCategory = await db
				.select({
					id: categories.id,
					slug: categories.slug,
					image: categories.image,
				})
				.from(categories)
				.where(eq(categories.id, id))
				.limit(1);

			if (existingCategory.length === 0) {
				throw new ApiError("Category not found", 404);
			}

			const categorySlug = existingCategory[0].slug;

			// Check products and child categories in parallel (independent queries)
			const [productsUsingCategory, childCategories] = await Promise.all([
				db
					.select({ id: products.id })
					.from(products)
					.where(eq(products.categorySlug, categorySlug))
					.limit(1),
				db
					.select({ id: categories.id })
					.from(categories)
					.where(eq(categories.parentSlug, categorySlug))
					.limit(1),
			]);

			if (productsUsingCategory.length > 0) {
				throw new ApiError(
					"Cannot delete category: there are products using this category",
					409,
				);
			}

			if (childCategories.length > 0) {
				throw new ApiError(
					"Cannot delete category: there are child categories using this category as parent",
					409,
				);
			}

			// Delete the category image from storage if it exists (outside transaction — storage I/O)
			// DB stores path without "images/" prefix, but bucket key includes it
			const categoryImage = existingCategory[0].image;
			if (categoryImage && !categoryImage.startsWith("images/staging/")) {
				try {
					const bucket = getStorageBucket();
					const storageKey = getProductImageStorageKey(categoryImage);
					await bucket.delete(storageKey);
				} catch (deleteError) {
					console.warn(
						"Failed to delete category image from storage:",
						deleteError,
					);
				}
			}

			// Delete the category
			await db.delete(categories).where(eq(categories.id, id));

			return {
				message: "Category deleted successfully",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting category:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
