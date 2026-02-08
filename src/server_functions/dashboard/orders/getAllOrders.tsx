import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { DB } from "~/db";
import { orderItems, orders, products, productVariations } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const getAllOrders = createServerFn({ method: "GET" })
	.inputValidator(
		(data: { limit?: number; offset?: number } = {}) =>
			data as { limit?: number; offset?: number },
	)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const limit = data?.limit ?? 50;
			const offset = data?.offset ?? 0;

			// Get total count for pagination metadata (single scalar query, cheap)
			const [{ total }] = await db
				.select({ total: sql<number>`count(*)` })
				.from(orders);

			// Fetch orders with LIMIT/OFFSET, sorted by newest first
			const ordersResult = await db
				.select()
				.from(orders)
				.orderBy(desc(orders.createdAt))
				.limit(limit)
				.offset(offset)
				.all();

			if (!ordersResult || ordersResult.length === 0) {
				return {
					groupedOrders: [],
					pagination: { total: 0, limit, offset, hasMore: false },
				};
			}

			const orderIds = ordersResult.map((o) => o.id);
			const allItemsResult = await db
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
					productName: products.name,
					productImages: products.images,

					// Variation fields
					variationId: productVariations.id,
					variationSku: productVariations.sku,
				})
				.from(orderItems)
				.leftJoin(products, eq(orderItems.productId, products.id))
				.leftJoin(
					productVariations,
					eq(orderItems.productVariationId, productVariations.id),
				)
				.where(inArray(orderItems.orderId, orderIds));

			// Group items by order ID in memory (fast)
			const itemsByOrderId = new Map<
				number,
				Array<{
					id: number;
					orderId: number;
					productId: number;
					quantity: number;
					unitAmount: number;
					discountPercentage: number | null;
					finalAmount: number;
					attributes: Record<string, string>;
					product: { name: string; images: string | null };
					variation?: { id: number; sku: string };
				}>
			>();

			for (const item of allItemsResult) {
				if (!itemsByOrderId.has(item.orderId)) {
					itemsByOrderId.set(item.orderId, []);
				}
				itemsByOrderId.get(item.orderId)?.push({
					id: item.id,
					orderId: item.orderId,
					productId: item.productId,
					quantity: item.quantity,
					unitAmount: item.unitAmount,
					discountPercentage: item.discountPercentage,
					finalAmount: item.finalAmount,
					attributes: (item.attributes
						? JSON.parse(item.attributes)
						: {}) as Record<string, string>,
					product: {
						name: item.productName || "Unknown Product",
						images: item.productImages,
					},
					variation: item.variationId
						? {
								id: item.variationId,
								sku: item.variationSku || "",
							}
						: undefined,
				});
			}

			// Attach items to orders
			const ordersWithRelations = ordersResult.map((order) => ({
				...order,
				items: itemsByOrderId.get(order.id) || [],
			}));

			// Group orders by status
			interface OrderGroup {
				title: string;
				orders: typeof ordersWithRelations;
			}

			const groupedOrders: OrderGroup[] = [];

			// Separate orders by status (already sorted by date DESC from SQL)
			const newOrders = ordersWithRelations.filter(
				(order) => order.status === "pending",
			);
			const processedOrders = ordersWithRelations.filter(
				(order) => order.status === "processed",
			);

			if (newOrders.length > 0) {
				groupedOrders.push({ title: "New", orders: newOrders });
			}

			if (processedOrders.length > 0) {
				groupedOrders.push({ title: "Processed", orders: processedOrders });
			}

			const hasMore = offset + limit < total;

			return {
				groupedOrders,
				pagination: {
					total,
					limit,
					offset,
					hasMore,
				},
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error fetching dashboard orders data:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
