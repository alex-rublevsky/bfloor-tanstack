import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { collections, products } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const deleteCollection = createServerFn({ method: "POST" })
	.inputValidator((data: { data: { id: number } }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id: collectionId } = data.data;

			if (Number.isNaN(collectionId)) {
				throw new ApiError("Invalid collection ID", 400);
			}

			// Check if collection exists
			const existingCollection = await db
				.select()
				.from(collections)
				.where(eq(collections.id, collectionId))
				.limit(1);

			if (!existingCollection[0]) {
				throw new ApiError("Коллекция не найдена", 404);
			}

			// Check if any products reference this collection
			// products.collectionSlug has onDelete: "set null" so products won't be deleted,
			// but productCollections junction rows will cascade-delete, affecting storefront filtering
			const productsUsingCollection = await db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.collectionSlug, existingCollection[0].slug))
				.limit(1);

			if (productsUsingCollection.length > 0) {
				throw new ApiError(
					"Cannot delete collection: there are products using this collection",
					409,
				);
			}

			// Delete collection
			await db.delete(collections).where(eq(collections.id, collectionId));

			return {
				message: "Коллекция удалена успешно!",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting collection:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
