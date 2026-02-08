import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { sql } from "drizzle-orm";
import { DB } from "~/db";
import { ApiError } from "~/utils/ApiError";

interface CategoryOrderUpdate {
	id: number;
	order: number;
}

/**
 * Bulk update category order values.
 * Used by the drag-and-drop reordering UI in the dashboard.
 * Uses a single CASE/WHEN SQL statement instead of N individual UPDATEs.
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

			// Single query: UPDATE categories SET "order" = CASE id WHEN ... END WHERE id IN (...)
			const ids = updates.map((u) => u.id);
			const whenClauses = updates.map((u) => sql`WHEN ${u.id} THEN ${u.order}`);

			await db.run(
				sql`UPDATE categories SET "order" = CASE id ${sql.join(whenClauses, sql` `)} END WHERE id IN ${ids}`,
			);

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
