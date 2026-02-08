import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
import { DB } from "~/db";
import { orderItems, orders } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const deleteOrder = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const orderId = data.id;

			if (Number.isNaN(orderId)) {
				throw new ApiError("Invalid order ID", 400);
			}

			// Delete order items + order in a single transaction
			// Use .returning() on the order DELETE to verify it existed
			await db.transaction(async (tx) => {
				await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
				const deleted = await tx
					.delete(orders)
					.where(eq(orders.id, orderId))
					.returning({ id: orders.id });

				if (deleted.length === 0) {
					throw new ApiError("Order not found", 404);
				}
			});

			return {
				message: "Order deleted successfully",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting order:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});

export const deleteOrders = createServerFn({ method: "POST" })
	.inputValidator((data: { ids: number[] }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const orderIds = data.ids;

			if (!Array.isArray(orderIds) || orderIds.length === 0) {
				throw new ApiError("Invalid order IDs", 400);
			}

			// Validate all IDs are numbers
			const validIds = orderIds.filter((id) => !Number.isNaN(id));
			if (validIds.length !== orderIds.length) {
				throw new ApiError("Some order IDs are invalid", 400);
			}

			// Check if all orders exist
			const existingOrders = await db
				.select({ id: orders.id })
				.from(orders)
				.where(inArray(orders.id, orderIds));

			if (existingOrders.length !== orderIds.length) {
				throw new ApiError("Some orders not found", 404);
			}

			// Delete order items + orders in a single transaction
			await db.transaction(async (tx) => {
				await tx
					.delete(orderItems)
					.where(inArray(orderItems.orderId, orderIds));
				await tx.delete(orders).where(inArray(orders.id, orderIds));
			});

			return {
				message: `${orderIds.length} order(s) deleted successfully`,
				deletedCount: orderIds.length,
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting orders:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
