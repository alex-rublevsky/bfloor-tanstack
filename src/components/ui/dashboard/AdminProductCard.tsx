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
			className="block h-full relative cursor-pointer w-full text-left border-none bg-transparent p-0"
			onMouseEnter={handleMouseEnter}
			aria-label={`Edit product ${product.name}`}
		>
			<div
				className="w-full product-card overflow-hidden group"
				id={styles.productCard}
			>
				<div className="bg-background flex flex-col">
					{/* Image Section */}
					<div className="relative aspect-square overflow-hidden">
						<div>
							{/* Primary Image */}
							<div className="relative aspect-square flex items-center justify-center overflow-hidden">
								{primaryImage ? (
									<div className="relative w-full h-full">
										{/* Loading skeleton, initially visible */}
										<div className="absolute inset-0 w-full h-full bfloor-img-skeleton">
											<Skeleton className="absolute inset-0 w-full h-full rounded-none" />
										</div>

										{/* Broken overlay, initially hidden */}
										<div className="absolute inset-0 hidden items-center justify-center flex-col text-muted-foreground select-none bfloor-img-fallback">
											<Icon name="image" className="w-12 h-12" />
											<span className="mt-2 text-xs">Картинка сломана</span>
										</div>

										{/* Primary Image */}
										<img
											src={`${ASSETS_BASE_URL}/${primaryImage}`}
											alt={product.name}
											loading="eager"
											className="absolute inset-0 w-full h-full object-cover object-center"
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
												className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100 hidden md:block"
												onError={(e) => {
													const t = e.currentTarget;
													t.style.display = "none";
												}}
											/>
										)}
									</div>
								) : (
									<div className="absolute inset-0 bg-muted flex flex-col items-center justify-center text-muted-foreground select-none">
										<Icon name="image" className="w-12 h-12" />
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
						<div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
							<div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-[2px] rounded-md border border-border/30 text-primary">
								<Edit className="w-4 h-4" />
								<span className="text-sm font-medium text-primary">
									Изменить
								</span>
							</div>
						</div>
					</div>

					{/* Content Section */}
					<div className="flex flex-col h-auto md:h-full">
						{/* Info Section */}
						<div className="p-4 flex flex-col h-auto md:h-full">
							{/* Price */}
							<div className="flex flex-col mb-2">
								<div className="flex flex-wrap items-center justify-between w-full gap-x-2">
									<div className="flex flex-col items-baseline gap-0 flex-shrink-0">
										{product.discount ? (
											<>
												<div className="whitespace-nowrap flex items-baseline gap-0.5">
													<span
														className="text-xl font-light"
														style={{
															viewTransitionName: `product-price-${product.id}`,
														}}
													>
														{Math.round(
															displayPrice *
															(1 - product.discount / 100)
														)}
													</span>
													<span className="text-xs font-light text-muted-foreground">
														р
													</span>
												</div>
												<div className="flex items-center gap-1">
													<span className="text-sm line-through text-muted-foreground">
														{Math.round(displayPrice)}
													</span>
													<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
														-{product.discount}%
													</span>
												</div>
											</>
										) : (
											<div className="whitespace-nowrap flex items-baseline gap-0.5">
												<span
													className="text-xl font-light"
													style={{
														viewTransitionName: `product-price-${product.id}`,
													}}
												>
													{Math.round(displayPrice)}
												</span>
												<span className="text-xs font-light text-muted-foreground">
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
