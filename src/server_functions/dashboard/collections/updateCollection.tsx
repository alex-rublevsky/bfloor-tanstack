import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { brands, collections, productCollections, products } from "~/schema";
import { ApiError } from "~/utils/ApiError";

interface CollectionFormData {
	name: string;
	slug: string;
	brandSlug: string;
	isActive: boolean;
}

export const updateCollection = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; data: CollectionFormData }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id: collectionId, data: collectionData } = data;

			if (Number.isNaN(collectionId)) {
				throw new ApiError("Invalid collection ID", 400);
			}

			if (
				!collectionData.name ||
				!collectionData.slug ||
				!collectionData.brandSlug
			) {
				throw new ApiError(
					"Missing required fields: name, slug, and brandSlug are required",
					400,
				);
			}

			// Check if collection exists, for duplicate slug, and validate brand exists
			const [existingCollection, duplicateSlug, brandExists] =
				await Promise.all([
					db
						.select()
						.from(collections)
						.where(eq(collections.id, collectionId))
						.limit(1),
					db
						.select()
						.from(collections)
						.where(eq(collections.slug, collectionData.slug))
						.limit(1),
					db
						.select({ slug: brands.slug })
						.from(brands)
						.where(eq(brands.slug, collectionData.brandSlug))
						.limit(1),
				]);

			if (!existingCollection[0]) {
				throw new ApiError("Коллекция не найдена", 404);
			}

			if (duplicateSlug[0] && duplicateSlug[0].id !== collectionId) {
				throw new ApiError("A collection with this slug already exists", 409);
			}

			if (brandExists.length === 0) {
				throw new ApiError(
					"Brand not found: the specified brandSlug does not exist",
					400,
				);
			}

			const oldSlug = existingCollection[0].slug;
			const slugChanged = oldSlug !== collectionData.slug;

			// Update collection + propagate slug changes in a single transaction
			const updatedCollection = await db.transaction(async (tx) => {
				const result = await tx
					.update(collections)
					.set({
						name: collectionData.name,
						slug: collectionData.slug,
						brandSlug: collectionData.brandSlug,
						isActive: collectionData.isActive,
					})
					.where(eq(collections.id, collectionId))
					.returning();

				// Propagate slug change to all referencing tables
				if (slugChanged) {
					await Promise.all([
						tx
							.update(products)
							.set({ collectionSlug: collectionData.slug })
							.where(eq(products.collectionSlug, oldSlug)),
						tx
							.update(productCollections)
							.set({ collectionSlug: collectionData.slug })
							.where(eq(productCollections.collectionSlug, oldSlug)),
					]);
				}

				return result;
			});

			return {
				message: "Коллекция обновлена успешно!",
				collection: updatedCollection[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating collection:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
