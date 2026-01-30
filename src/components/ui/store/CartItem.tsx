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
			<div className="shrink-0 relative w-20">
				<div className="relative aspect-square w-full bg-muted rounded-md overflow-hidden">
					{imageArray.length > 0 ? (
						<div className="relative w-full h-full">
							{/* Loading skeleton, initially visible */}
							<div className="absolute inset-0 w-full h-full bfloor-img-skeleton">
								<Skeleton className="absolute inset-0 w-full h-full rounded-none" />
							</div>

							{/* Broken overlay, initially hidden */}
							<div className="absolute inset-0 hidden items-center justify-center flex-col text-muted-foreground select-none bfloor-img-fallback">
								<Icon name="image" className="w-8 h-8" />
								<span className="mt-1 text-xs">Картинка сломана</span>
							</div>

							{/* Primary Image - using same URL format as ProductCard for browser caching */}
							<img
								src={`${ASSETS_BASE_URL}/${imageArray[0]}`}
								alt={item.productName}
								loading="eager"
								className="absolute inset-0 w-full h-full object-cover object-center"
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
						<div className="absolute inset-0 bg-muted flex flex-col items-center justify-center text-muted-foreground select-none">
							<Icon name="image" className="w-8 h-8" />
							<span className="mt-1 text-xs">Нет картинки</span>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={() => removeFromCart(item.productId, item.variationId)}
					className="absolute translate-x-1/2 translate-y-1/2 bottom-0 right-0 p-1 bg-background/80 hover:bg-background/80 active:bg-background/80 backdrop-blur-[2px] rounded-md shadow-sm text-secondary-foreground hover:text-foreground active:text-foreground cursor-pointer transition-colors"
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
					<div className="flex flex-wrap gap-x-6 gap-y-0 mt-1">
						{Object.entries(item.attributes).map(([key, value]) => (
							<span key={key} className="text-sm text-muted-foreground">
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
				{item.discount ? (
					<div className="flex flex-col items-end">
						<Badge variant="greenOutline" className="translate-x-2">
							Скидка {item.discount}%
						</Badge>
						<span className="line-through text-sm text-muted-foreground">
							{Math.round(item.price * item.quantity)} р
						</span>
						<h6>
							{Math.round(item.price * (1 - item.discount / 100) * item.quantity)}{" "}
							р
						</h6>
					</div>
				) : (
					<h6>{Math.round(item.price * item.quantity)} р</h6>
				)}
			</div>
		</div>
	);
}
