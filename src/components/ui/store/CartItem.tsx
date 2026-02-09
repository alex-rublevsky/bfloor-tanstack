import { Badge } from "~/components/ui/shared/Badge";
import { Link } from "~/components/ui/shared/Link";
import { QuantitySelector } from "~/components/ui/shared/QuantitySelector";
import { ASSETS_BASE_URL } from "~/constants/urls";
import type { EnrichedCartItem } from "~/hooks/useEnrichedCart";
import {
	getAttributeDisplayName,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
import { useCart } from "~/lib/cartContext";
import { parseImages } from "~/utils/productParsing";
import { Skeleton } from "../dashboard/skeleton";
import { Icon, X } from "../shared/Icon";

interface CartItemProps {
	item: EnrichedCartItem;
	enrichedItems: EnrichedCartItem[];
}

export function CartItem({ item }: CartItemProps) {
	const { updateQuantity, removeFromCart } = useCart();
	const { data: attributes } = useProductAttributes();

	const handleIncrement = () => {
		updateQuantity(item.productId, item.quantity + 1, item.variationId);
	};

	const handleDecrement = () => {
		if (item.quantity > 1) {
			updateQuantity(item.productId, item.quantity - 1, item.variationId);
		}
	};

	// Parse images the same way ProductCard does
	const imageArray = parseImages(item.images);

	return (
		<div className="flex items-start gap-4 py-4">
			{/* Product image with overlapping remove button */}
			<div className="relative w-20 shrink-0">
				<div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
					{imageArray.length > 0 ? (
						<div className="relative h-full w-full">
							{/* Loading skeleton, initially visible */}
							<div className="bfloor-img-skeleton absolute inset-0 h-full w-full">
								<Skeleton className="absolute inset-0 h-full w-full rounded-none" />
							</div>

							{/* Broken overlay, initially hidden */}
							<div className="bfloor-img-fallback absolute inset-0 hidden select-none flex-col items-center justify-center text-muted-foreground">
								<Icon name="image" className="h-8 w-8" />
								<span className="mt-1 text-xs">Картинка сломана</span>
							</div>

							{/* Primary Image - using same URL format as ProductCard for browser caching */}
							<img
								src={`${ASSETS_BASE_URL}/${imageArray[0]}`}
								alt={item.productName}
								loading="eager"
								className="absolute inset-0 h-full w-full object-cover object-center"
								onLoad={(e) => {
									const parent = e.currentTarget.parentElement;
									const sk = parent?.querySelector<HTMLDivElement>(
										".bfloor-img-skeleton",
									);
									if (sk) sk.style.display = "none";
								}}
								onError={(e) => {
									const img = e.currentTarget;
									const parent = img.parentElement;
									img.style.display = "none";
									const sk = parent?.querySelector<HTMLDivElement>(
										".bfloor-img-skeleton",
									);
									if (sk) sk.style.display = "none";
									const fb = parent?.querySelector<HTMLDivElement>(
										".bfloor-img-fallback",
									);
									if (fb) fb.style.display = "flex";
								}}
							/>
						</div>
					) : (
						<div className="absolute inset-0 flex select-none flex-col items-center justify-center bg-muted text-muted-foreground">
							<Icon name="image" className="h-8 w-8" />
							<span className="mt-1 text-xs">Нет картинки</span>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={() => removeFromCart(item.productId, item.variationId)}
					className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-pointer rounded-md bg-background/80 p-1 text-secondary-foreground shadow-sm backdrop-blur-[2px] transition-colors hover:bg-background/80 hover:text-foreground active:bg-background/80 active:text-foreground"
					aria-label="Удалить из корзины"
				>
					<X size={16} />
				</button>
			</div>

			{/* Product info */}
			<div className="grow">
				<Link href={`/product/${item.productSlug}`} className="hover:underline">
					{item.productName}
				</Link>

				{item.attributes && Object.entries(item.attributes).length > 0 && (
					<div className="mt-1 flex flex-wrap gap-x-6 gap-y-0">
						{Object.entries(item.attributes).map(([key, value]) => (
							<span key={key} className="text-muted-foreground text-sm">
								{getAttributeDisplayName(key, attributes || [])}: {value}
							</span>
						))}
					</div>
				)}

				<div className="mt-2">
					<QuantitySelector
						quantity={item.quantity}
						onIncrement={handleIncrement}
						onDecrement={handleDecrement}
						size="compact"
					/>
				</div>
			</div>

			{/* Price column */}
			<div className="flex flex-col items-end">
				{(() => {
					const unitPrice = item.squareMetersPerPack
						? item.price * item.squareMetersPerPack
						: item.price;
					if (item.discount) {
						return (
							<div className="flex flex-col items-end">
								<Badge variant="greenOutline" className="translate-x-2">
									Скидка {item.discount}%
								</Badge>
								<span className="text-muted-foreground text-sm line-through">
									{Math.round(unitPrice * item.quantity)} р
								</span>
								<h6>
									{Math.round(
										unitPrice * (1 - item.discount / 100) * item.quantity,
									)}{" "}
									р
								</h6>
							</div>
						);
					}
					return <h6>{Math.round(unitPrice * item.quantity)} р</h6>;
				})()}
			</div>
		</div>
	);
}
