import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { categories } from "~/schema";

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
				setResponseStatus(400);
				throw new Error("No updates provided");
			}

			// Update each category's order in a transaction-like manner
			// SQLite doesn't have true transactions via drizzle-orm sqlite-proxy,
			// but we can batch the updates
			for (const update of updates) {
				await db
					.update(categories)
					.set({ order: update.order })
					.where(eq(categories.id, update.id));
			}

			return {
				message: "Category order updated successfully",
				updatedCount: updates.length,
			};
		} catch (error) {
			console.error("Error updating category order:", error);
			setResponseStatus(500);
			throw new Error("Failed to update category order");
		}
	});
