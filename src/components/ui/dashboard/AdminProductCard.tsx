import { Link } from "@tanstack/react-router";
import { Skeleton } from "~/components/ui/dashboard/skeleton";
import { Badge } from "~/components/ui/shared/Badge";
import { Eye, Icon } from "~/components/ui/shared/Icon";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { usePrefetch } from "~/hooks/usePrefetch";
import type { ProductWithVariations } from "~/types";
import { Edit } from "../shared/Icon";
import styles from "../store/productCard.module.css";

interface AdminProductCardProps {
	product: ProductWithVariations;
	formatPrice: (price: number) => string;
}

export function AdminProductCard({
	product,
	formatPrice: _formatPrice,
}: AdminProductCardProps) {
	const { prefetchDashboardProduct } = usePrefetch();
	const imageArray = (() => {
		if (!product.images) return [];
		try {
			return JSON.parse(product.images) as string[];
		} catch {
			// Fallback to comma-separated parsing for backward compatibility
			return product.images
				.split(",")
				.map((img) => img.trim())
				.filter(Boolean);
		}
	})();
	const primaryImage = imageArray[0];

	// Calculate the display price - use highest variation price if variations exist, otherwise base price
	const displayPrice = (() => {
		if (
			product.hasVariations &&
			product.variations &&
			product.variations.length > 0
		) {
			const prices = product.variations.map((v) => v.price);
			return Math.max(...prices);
		}
		return product.price;
	})();

	// Prefetch on hover
	const handleMouseEnter = () => {
		prefetchDashboardProduct(product.id);
	};

	return (
		<Link
			to="/dashboard/products/$productId/edit"
			params={{ productId: product.id.toString() }}
			className="relative block h-full w-full cursor-pointer border-none bg-transparent p-0 text-left"
			onMouseEnter={handleMouseEnter}
			aria-label={`Edit product ${product.name}`}
		>
			<div
				className="product-card group w-full overflow-hidden"
				id={styles.productCard}
			>
				<div className="flex flex-col bg-background">
					{/* Image Section */}
					<div className="relative aspect-square overflow-hidden">
						<div>
							{/* Primary Image */}
							<div className="relative flex aspect-square items-center justify-center overflow-hidden">
								{primaryImage ? (
									<div className="relative h-full w-full">
										{/* Loading skeleton, initially visible */}
										<div className="bfloor-img-skeleton absolute inset-0 h-full w-full">
											<Skeleton className="absolute inset-0 h-full w-full rounded-none" />
										</div>

										{/* Broken overlay, initially hidden */}
										<div className="bfloor-img-fallback absolute inset-0 hidden select-none flex-col items-center justify-center text-muted-foreground">
											<Icon name="image" className="h-12 w-12" />
											<span className="mt-2 text-xs">Картинка сломана</span>
										</div>

										{/* Primary Image */}
										<img
											src={`${ASSETS_BASE_URL}/${primaryImage}`}
											alt={product.name}
											loading="eager"
											className="absolute inset-0 h-full w-full object-cover object-center"
											style={{
												viewTransitionName: `product-image-${product.id}`,
											}}
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
										{/* Secondary Image (if exists) - Only on desktop devices with hover capability */}
										{imageArray.length > 1 && (
											<img
												src={`${ASSETS_BASE_URL}/${imageArray[1]}`}
												alt={product.name}
												loading="eager"
												className="absolute inset-0 hidden h-full w-full object-cover object-center opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 md:block"
												onError={(e) => {
													const t = e.currentTarget;
													t.style.display = "none";
												}}
											/>
										)}
									</div>
								) : (
									<div className="absolute inset-0 flex select-none flex-col items-center justify-center bg-muted text-muted-foreground">
										<Icon name="image" className="h-12 w-12" />
										<span className="mt-2 text-xs">Нет картинки</span>
									</div>
								)}
							</div>
						</div>

						{/* Views Badge - Top Right */}
						{product.viewCount > 0 && (
							<div className="absolute top-2 right-2 z-10">
								<Badge variant="secondary" className="flex items-center gap-1">
									<Eye className="size-3" />
									<span>{product.viewCount}</span>
								</Badge>
							</div>
						)}

						{/* Featured Badge - Below Views Badge */}
						{product.isFeatured && (
							<div
								className={`absolute ${product.viewCount > 0 ? "top-10" : "top-2"} right-2 z-10`}
							>
								<Badge variant="default">Featured</Badge>
							</div>
						)}

						{/* Desktop Edit Indicator - Centered on image */}
						<div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
							<div className="flex items-center justify-center gap-2 rounded-md border border-border/30 bg-background/80 px-3 py-1.5 text-primary backdrop-blur-[2px]">
								<Edit className="h-4 w-4" />
								<span className="font-medium text-primary text-sm">
									Изменить
								</span>
							</div>
						</div>
					</div>

					{/* Content Section */}
					<div className="flex h-auto flex-col md:h-full">
						{/* Info Section */}
						<div className="flex h-auto flex-col p-4 md:h-full">
							{/* Price */}
							<div className="mb-2 flex flex-col">
								<div className="flex w-full flex-wrap items-center justify-between gap-x-2">
									<div className="flex flex-shrink-0 flex-col items-baseline gap-0">
										{product.discount ? (
											<>
												<div className="flex items-baseline gap-0.5 whitespace-nowrap">
													<span
														className="font-light text-xl"
														style={{
															viewTransitionName: `product-price-${product.id}`,
														}}
													>
														{Math.round(
															displayPrice * (1 - product.discount / 100),
														)}
													</span>
													<span className="font-light text-muted-foreground text-xs">
														р
													</span>
												</div>
												<div className="flex items-center gap-1">
													<span className="text-muted-foreground text-sm line-through">
														{Math.round(displayPrice)}
													</span>
													<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs">
														-{product.discount}%
													</span>
												</div>
											</>
										) : (
											<div className="flex items-baseline gap-0.5 whitespace-nowrap">
												<span
													className="font-light text-xl"
													style={{
														viewTransitionName: `product-price-${product.id}`,
													}}
												>
													{Math.round(displayPrice)}
												</span>
												<span className="font-light text-muted-foreground text-xs">
													р
												</span>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Product Name */}
							<p
								className="mb-3"
								style={{
									viewTransitionName: `product-name-${product.id}`,
								}}
							>
								{product.name}
							</p>

							{/* Metadata */}
							<div className="space-y-1 text-sm">
								{/* Empty space for layout */}
							</div>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}
