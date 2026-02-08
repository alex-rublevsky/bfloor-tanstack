import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { productStoreLocations } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const getProductStoreLocations = createServerFn({ method: "GET" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		const db = DB();
		const rows = await db
			.select()
			.from(productStoreLocations)
			.where(eq(productStoreLocations.productId, data.id));
		return rows;
	});

export const updateProductStoreLocations = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { productId: number; storeLocationIds: number[] }) => data,
	)
	.handler(async ({ data }) => {
		try {
			const db = DB();

			if (Number.isNaN(data.productId) || data.productId <= 0) {
				throw new ApiError("Invalid product ID", 400);
			}

			// Delete + re-insert in a transaction so they're atomic
			await db.transaction(async (tx) => {
				await tx
					.delete(productStoreLocations)
					.where(eq(productStoreLocations.productId, data.productId));

				if (data.storeLocationIds.length > 0) {
					const insertData = data.storeLocationIds
						.filter(
							(id): id is number => typeof id === "number" && !Number.isNaN(id),
						)
						.map((storeLocationId) => ({
							productId: data.productId,
							storeLocationId,
							createdAt: new Date(),
						}));

					if (insertData.length > 0) {
						await tx.insert(productStoreLocations).values(insertData);
					}
				}
			});

			return { message: "Product store locations updated" };
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating product store locations:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
