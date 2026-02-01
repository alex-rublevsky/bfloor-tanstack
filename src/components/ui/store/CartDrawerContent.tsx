import {
	DrawerBody,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "~/components/ui/shared/Drawer";
import { useEnrichedCart } from "~/hooks/useEnrichedCart";
import { useCart } from "~/lib/cartContext";
import { ShoppingBag } from "../shared/Icon";
import { CartItem } from "./CartItem";
import { CartCheckoutButton, CartSummary } from "./CartSummary";

export function CartDrawerContent() {
	const { cart } = useCart();

	// Enrich cart items with product data from TanStack Query cache
	// This must be called unconditionally (hooks rule)
	const enrichedItems = useEnrichedCart(cart.items);

	// Show loading state if cart has items but enriched items are still loading
	const isLoading = cart.items.length > 0 && enrichedItems.length === 0;

	return (
		<>
			<DrawerHeader>
				<DrawerTitle>Корзина</DrawerTitle>
				<DrawerDescription>
					Просмотрите и управляйте товарами в корзине
				</DrawerDescription>
			</DrawerHeader>

			<DrawerBody>
				{isLoading ? (
					<div className="flex h-full flex-col items-center justify-center">
						<p className="text-muted-foreground">Загрузка товаров...</p>
					</div>
				) : enrichedItems.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center">
						<ShoppingBag size={48} className="mb-4 text-muted" />
						<p className="text-muted-foreground">Ваша корзина пуста</p>
					</div>
				) : (
					<div className="space-y-6">
						<div className="space-y-4">
							{enrichedItems.map((item) => (
								<CartItem
									key={`${item.productId}-${item.variationId || "default"}`}
									item={item}
									enrichedItems={enrichedItems}
								/>
							))}
						</div>
						<CartSummary />
					</div>
				)}
			</DrawerBody>

			{enrichedItems.length > 0 && (
				<DrawerFooter>
					<CartCheckoutButton />
				</DrawerFooter>
			)}
		</>
	);
}
