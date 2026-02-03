import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
import { DB } from "~/db";
import { orderItems, orders, products, productVariations } from "~/schema";

export const getAllOrders = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const db = DB();

			// Fetch all orders
			const ordersResult = await db.select().from(orders).all();

			if (!ordersResult || ordersResult.length === 0) {
				return { groupedOrders: [] };
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
					attributes: Record<string, unknown>;
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
					attributes: item.attributes ? JSON.parse(item.attributes) : {},
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

			// Separate orders by status
			const newOrders = ordersWithRelations.filter(
				(order) => order.status === "pending",
			);
			const processedOrders = ordersWithRelations.filter(
				(order) => order.status === "processed",
			);

			// Sort by date (newest first) within each group
			const sortByDate = (
				a: (typeof ordersWithRelations)[0],
				b: (typeof ordersWithRelations)[0],
			) => {
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			};

			// Add groups with sorted orders
			if (newOrders.length > 0) {
				groupedOrders.push({
					title: "New",
					orders: newOrders.sort(sortByDate),
				});
			}

			if (processedOrders.length > 0) {
				groupedOrders.push({
					title: "Processed",
					orders: processedOrders.sort(sortByDate),
				});
			}

			return { groupedOrders };
		} catch (error) {
			console.error("Error fetching dashboard orders data:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch dashboard orders data");
		}
	},
);
