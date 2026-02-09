import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { DB } from "~/db";
import { orderItems, orders } from "~/schema";
import type { ProductListItem } from "~/types";

// TypeScript interfaces
interface CartItem {
	productId: number;
	productName: string;
	productSlug: string;
	variationId?: number;
	quantity: number;
	addedAt: number; // From minimal CartItem
	price: number;
	discount?: number | null;
	image?: string;
	attributes?: Record<string, string>;
	squareMetersPerPack?: number | null;
}

interface CustomerInfo {
	notes?: string;
	shippingMethod?: string;
}

interface OrderCreationRequest {
	customerInfo: CustomerInfo;
	cartItems: CartItem[];
	products: ProductListItem[];
}

export const createOrder = createServerFn({ method: "POST" })
	.inputValidator((data: OrderCreationRequest) => data)
	.handler(async ({ data }) => {
		try {
			const { customerInfo, cartItems, products } = data;

			// Validate required fields
			if (!cartItems || cartItems.length === 0) {
				setResponseStatus(400);
				throw new Error("Cart is empty");
			}

			if (!products || products.length === 0) {
				setResponseStatus(400);
				throw new Error("Product data is required");
			}

			// Create the order using the existing createOrder function
			const { order } = await createOrderInternal(
				customerInfo,
				cartItems,
				products,
			);

			// Small delay to ensure database transaction is fully committed
			await new Promise((resolve) => setTimeout(resolve, 2000));

			return {
				success: true,
				message: "Order created successfully",
				orderId: order.id,
			};
		} catch (error) {
			console.error("Order creation error:", error);

			let errorMessage = "Unknown error occurred";
			if (error instanceof Error) {
				if (error.message.includes("Variation not found")) {
					errorMessage =
						"Some items in your cart are no longer available with the selected options. Please refresh the page and update your cart.";
				} else if (
					error.message.includes("Email service configuration error")
				) {
					errorMessage =
						"Order was created but email notifications failed. Our team will contact you shortly.";
				} else {
					errorMessage = error.message;
				}
			}

			setResponseStatus(500);
			throw new Error(errorMessage);
		}
	});

// Internal order creation function (renamed from createOrder)
async function createOrderInternal(
	customerInfo: CustomerInfo,
	cartItems: CartItem[],
	products: ProductListItem[],
) {
	const db = DB();
	// Create a map for O(1) lookups
	const productMap = new Map(products.map((p) => [p.id, p]));

	// Validate all items in one pass
	const orderAmounts = cartItems.reduce(
		(acc, item) => {
			// 1. Validate product exists
			const product = productMap.get(item.productId);
			if (!product) {
				throw new Error(`Product not found: ${item.productName}`);
			}

			// 1.5. Validate product is active
			if (!product.isActive) {
				throw new Error(`Product is no longer available: ${item.productName}`);
			}

			// 2. Validate variation and price
			if (product.hasVariations && !item.variationId) {
				throw new Error(`Variation required for product: ${item.productName}`);
			}

			if (!product.hasVariations && item.variationId) {
				throw new Error(
					`Product does not support variations: ${item.productName}`,
				);
			}

			// If variation is required, validate it exists
			if (item.variationId) {
				const variation = product.variations?.find(
					(v) => v.id === item.variationId,
				);
				if (!variation) {
					throw new Error(
						`Variation not found for product: ${item.productName}`,
					);
				}
			}

			// 3. Validate price (price per m² for flooring, or per unit)
			const expectedPrice =
				product.hasVariations && item.variationId
					? product.variations?.find((v) => v.id === item.variationId)?.price
					: product.price;

			if (expectedPrice !== item.price) {
				throw new Error(
					`Price mismatch for ${item.productName}: Expected ${expectedPrice}, got ${item.price}`,
				);
			}

			// 4. Calculate amounts
			// For flooring products, unit price = price per m² × squareMetersPerPack
			if (item.price < 0 || item.quantity <= 0) {
				throw new Error(`Invalid price or quantity for ${item.productName}`);
			}

			const unitPrice = item.squareMetersPerPack
				? item.price * item.squareMetersPerPack
				: item.price;
			const itemSubtotal = unitPrice * item.quantity;
			const itemDiscount =
				item.discount && item.discount > 0 && item.discount <= 100
					? itemSubtotal * (item.discount / 100)
					: 0;

			return {
				subtotalAmount: acc.subtotalAmount + itemSubtotal,
				discountAmount: acc.discountAmount + itemDiscount,
			};
		},
		{ subtotalAmount: 0, discountAmount: 0 },
	);

	const shippingAmount = 0; // Will be determined later
	const totalAmount =
		orderAmounts.subtotalAmount - orderAmounts.discountAmount + shippingAmount;

	if (totalAmount < 0) {
		throw new Error(`Invalid total amount: ${totalAmount}`);
	}

	const now = new Date();

	// Create order
	const [order] = await db
		.insert(orders)
		.values({
			subtotalAmount: orderAmounts.subtotalAmount,
			discountAmount: orderAmounts.discountAmount,
			shippingAmount,
			totalAmount,
			currency: "р",
			paymentStatus: "pending",
			paymentMethod: null,
			shippingMethod: customerInfo.shippingMethod ?? null,
			notes: customerInfo.notes ?? null,
			createdAt: now,
			completedAt: null,
		})
		.returning();

	// Create order items
	// For flooring products, unit price = price per m² × squareMetersPerPack
	await db.insert(orderItems).values(
		cartItems.map((item) => {
			const unitPrice = item.squareMetersPerPack
				? item.price * item.squareMetersPerPack
				: item.price;
			return {
				orderId: order.id,
				productId: item.productId,
				productVariationId: item.variationId ?? null,
				quantity: item.quantity,
				unitAmount: unitPrice,
				discountPercentage: item.discount ?? null,
				finalAmount: item.discount
					? unitPrice * (1 - item.discount / 100) * item.quantity
					: unitPrice * item.quantity,
				attributes: JSON.stringify(
					item.attributes && typeof item.attributes === "object"
						? item.attributes
						: {},
				),
				createdAt: now,
			};
		}),
	);

	return { order, orderAmounts, totalAmount };
}
