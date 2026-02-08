import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, sql } from "drizzle-orm";
import { DB } from "~/db";
import { orders } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const updateOrderStatus = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; status: string }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id: orderId, status } = data;

			if (Number.isNaN(orderId)) {
				throw new ApiError("Invalid order ID", 400);
			}

			if (!status) {
				throw new ApiError("Status is required", 400);
			}

			// Validate status
			const validStatuses = [
				"pending",
				"processed",
				"shipped",
				"delivered",
				"cancelled",
			];
			if (!validStatuses.includes(status)) {
				throw new ApiError(
					`Invalid status. Must be one of: ${validStatuses.join(", ")}`,
					400,
				);
			}

			// Single UPDATE with COALESCE — no need for a separate SELECT
			// completedAt is only set on first "processed" transition (COALESCE keeps existing value)
			const updateData: Record<string, unknown> = { status };
			if (status === "processed") {
				updateData.completedAt = sql`COALESCE(${orders.completedAt}, ${new Date()})`;
			}

			const updatedOrder = await db
				.update(orders)
				.set(updateData)
				.where(eq(orders.id, orderId))
				.returning();

			if (updatedOrder.length === 0) {
				throw new ApiError("Order not found", 404);
			}

			return {
				success: true,
				message: "Order status updated successfully",
				order: updatedOrder[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating order status:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
