import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { orderItems, orders, products } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const getOrderBySlug = createServerFn({ method: "GET" })
	.inputValidator((data: { orderId: string }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { orderId } = data;
			const orderIdNum = parseInt(orderId, 10);

			if (Number.isNaN(orderIdNum)) {
				throw new ApiError("Invalid order ID", 400);
			}

			// Fetch order with all related data
			const [orderResult, itemsResult] = await Promise.all([
				// Get the order
				db
					.select()
					.from(orders)
					.where(eq(orders.id, orderIdNum))
					.limit(1),

				// Get order items with product data
				db
					.select({
						// Order item fields
						id: orderItems.id,
						orderId: orderItems.orderId,
						productId: orderItems.productId,
						productVariationId: orderItems.productVariationId,
						quantity: orderItems.quantity,
						unitAmount: orderItems.unitAmount,
						discountPercentage: orderItems.discountPercentage,
						finalAmount: orderItems.finalAmount,
						attributes: orderItems.attributes,
						createdAt: orderItems.createdAt,

						// Product fields
						product: {
							id: products.id,
							name: products.name,
							slug: products.slug,
							images: products.images,
							description: products.description,
							price: products.price,
						},
					})
					.from(orderItems)
					.leftJoin(products, eq(orderItems.productId, products.id))
					.where(eq(orderItems.orderId, orderIdNum)),
			]);

			if (!orderResult[0]) {
				// Don't set response status - let TanStack Router handle 404s via notFound()
				// Setting status here causes Vercel to return platform-level NOT_FOUND error
				throw new Error("Order not found");
			}

			const order = orderResult[0];
			const items = itemsResult.map((item) => ({
				id: item.id,
				orderId: item.orderId,
				productId: item.productId,
				productVariationId: item.productVariationId,
				quantity: item.quantity,
				unitAmount: item.unitAmount,
				discountPercentage: item.discountPercentage,
				finalAmount: item.finalAmount,
				attributes: item.attributes ? JSON.parse(item.attributes) : {},
				createdAt: item.createdAt,
				product: item.product,
			}));

			const orderWithRelations = {
				...order,
				items,
			};

			return orderWithRelations;
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error fetching order:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
