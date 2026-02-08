import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { collections } from "~/schema";
import { ApiError } from "~/utils/ApiError";

interface CollectionFormData {
	name: string;
	slug: string;
	brandSlug: string;
	isActive: boolean;
}

export const createCollection = createServerFn({ method: "POST" })
	.inputValidator((data: { data: CollectionFormData }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const collectionData = data.data;

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

			// Check for duplicate slug
			const duplicateSlug = await db
				.select()
				.from(collections)
				.where(eq(collections.slug, collectionData.slug))
				.limit(1);

			if (duplicateSlug[0]) {
				throw new ApiError("A collection with this slug already exists", 409);
			}

			// Insert collection
			const insertedCollections = await db
				.insert(collections)
				.values({
					name: collectionData.name,
					slug: collectionData.slug,
					brandSlug: collectionData.brandSlug,
					isActive: collectionData.isActive,
				})
				.returning();

			return {
				message: "Коллекция создана успешно!",
				collection: insertedCollections[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error creating collection:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
