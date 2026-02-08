import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
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

			// Check if order exists
			const existingOrder = await db
				.select()
				.from(orders)
				.where(eq(orders.id, orderId))
				.limit(1);

			if (!existingOrder[0]) {
				throw new ApiError("Order not found", 404);
			}

			// Update order status
			const updateData: { status: string; completedAt?: Date } = { status };

			// If marking as processed and not already completed, set completedAt
			if (status === "processed" && !existingOrder[0].completedAt) {
				updateData.completedAt = new Date();
			}

			const updatedOrder = await db
				.update(orders)
				.set(updateData)
				.where(eq(orders.id, orderId))
				.returning();

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
