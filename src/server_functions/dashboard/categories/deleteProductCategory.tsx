import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { categories, products } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";

export const deleteProductCategory = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const id = data.id;

			if (Number.isNaN(id)) {
				throw new ApiError("Invalid category ID", 400);
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

			// Check if any products are using this category
			// CRITICAL: categories.slug has onDelete: "cascade" on products,
			// so deleting a category would silently delete all its products
			const productsUsingCategory = await db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.categorySlug, existingCategory[0].slug))
				.limit(1);

			if (productsUsingCategory.length > 0) {
				throw new ApiError(
					"Cannot delete category: there are products using this category",
					409,
				);
			}

			// Delete the category image from storage if it exists
			const categoryImage = existingCategory[0].image;
			if (categoryImage && !categoryImage.startsWith("staging/")) {
				try {
					const bucket = getStorageBucket();
					await bucket.delete(categoryImage);
				} catch (deleteError) {
					console.warn(
						"Failed to delete category image from storage:",
						deleteError,
					);
					// Don't fail the category deletion if image deletion fails
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
