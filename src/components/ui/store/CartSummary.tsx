import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/shared/Button";
import { useEnrichedCart } from "~/hooks/useEnrichedCart";
import { useCart } from "~/lib/cartContext";
import { Badge } from "../shared/Badge";

export function CartSummary() {
	const { cart } = useCart();
	const enrichedItems = useEnrichedCart(cart.items);

	// Calculate cart totals with discounts
	const subtotal = enrichedItems.reduce(
		(total, item) => total + item.price * item.quantity,
		0,
	);

	const discountTotal = enrichedItems.reduce((total, item) => {
		if (item.discount) {
			return total + (item.price * item.quantity * item.discount) / 100;
		}
		return total;
	}, 0);

	const total = subtotal - discountTotal;

	return (
		<div className="space-y-2 pb-0">
			<div className="flex justify-between text-sm">
				<p>Промежуточный итог</p>
				<p>{Math.round(subtotal)} р</p>
			</div>

			{discountTotal > 0 && (
				<div className="flex justify-between text-foreground text-sm">
					<p>Скидка</p>
					<Badge variant="green" className="translate-x-2 text-sm">
						-{Math.round(discountTotal)} р
					</Badge>
				</div>
			)}

			<div className="flex justify-between">
				<span>Итого</span>
				<h4>{Math.round(total)} р</h4>
			</div>

			<p className="pt-2 text-center text-muted-foreground text-xs">
				Доставка будет рассчитана при оформлении заказа
			</p>
		</div>
	);
}

export function CartCheckoutButton() {
	const { cart, setCartOpen } = useCart();
	const enrichedItems = useEnrichedCart(cart.items);
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();

	// Calculate total with discounts
	const subtotal = enrichedItems.reduce(
		(total, item) => total + item.price * item.quantity,
		0,
	);

	const discountTotal = enrichedItems.reduce((total, item) => {
		if (item.discount) {
			return total + (item.price * item.quantity * item.discount) / 100;
		}
		return total;
	}, 0);

	const total = subtotal - discountTotal;

	const handleCheckout = async () => {
		if (cart.items.length === 0) return;

		setIsLoading(true);

		try {
			// Close the cart drawer
			setCartOpen(false);

			// Redirect to checkout page
			navigate({ to: "/store/checkout" });
		} catch (error) {
			console.error("Checkout error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button
			onClick={handleCheckout}
			disabled={cart.items.length === 0 || isLoading}
			className="w-full"
		>
			{isLoading ? "Обработка..." : `Оформить заказ ${Math.round(total)} р`}
		</Button>
	);
}
