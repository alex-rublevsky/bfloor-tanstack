import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { categories } from "~/schema";
import { ApiError } from "~/utils/ApiError";

interface CategoryOrderUpdate {
	id: number;
	order: number;
}

/**
 * Bulk update category order values.
 * Used by the drag-and-drop reordering UI in the dashboard.
 */
export const updateCategoryOrder = createServerFn({ method: "POST" })
	.inputValidator((data: { updates: CategoryOrderUpdate[] }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { updates } = data;

			if (!updates || updates.length === 0) {
				throw new ApiError("No updates provided", 400);
			}

			// All order updates in a single transaction for atomicity
			await db.transaction(async (tx) => {
				for (const update of updates) {
					await tx
						.update(categories)
						.set({ order: update.order })
						.where(eq(categories.id, update.id));
				}
			});

			return {
				message: "Category order updated successfully",
				updatedCount: updates.length,
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating category order:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
