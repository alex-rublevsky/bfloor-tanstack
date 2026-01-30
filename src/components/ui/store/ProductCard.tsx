import { Link } from "@tanstack/react-router";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "~/components/ui/dashboard/skeleton";
import { Button } from "~/components/ui/shared/Button";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { usePrefetch } from "~/hooks/usePrefetch";
import {
	getAttributeDisplayName,
	getAttributeNameFromSlug,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
import { useVariationSelection } from "~/hooks/useVariationSelection";
import { useCart } from "~/lib/cartContext";
import type {
	ProductAttribute,
	ProductVariationWithAttributes,
	ProductWithVariations,
	VariationAttribute,
} from "~/types";
import { parseImages } from "~/utils/productParsing";
import { sortVariationsForDisplay } from "~/utils/variationSort";
import { FilterGroup } from "../shared/FilterGroup";
import { Icon } from "../shared/Icon";
import styles from "./productCard.module.css";

// Memoized broken image fallback component
// This is identical for all product cards, so we memoize it to avoid re-renders
const BrokenImageFallback = memo(() => (
	<div className="absolute inset-0 hidden items-center justify-center flex-col text-muted-foreground select-none bfloor-img-fallback">
		<Icon name="image" className="w-12 h-12" />
		<span className="mt-2 text-xs">Картинка сломана</span>
	</div>
));
BrokenImageFallback.displayName = "BrokenImageFallback";

// Types are now imported from ~/types

const calculateUniqueAttributeValues = (
	variations: ProductVariationWithAttributes[] | undefined,
	attributeId: string,
): string[] => {
	if (!variations) return [];

	const sortedVariations = sortVariationsForDisplay(variations);

	const values = new Set<string>();
	sortedVariations.forEach((variation) => {
		const attribute = variation.attributes.find(
			(attr) => attr.attributeId === attributeId,
		);
		if (attribute) {
			values.add(attribute.value);
		}
	});

	return Array.from(values);
};

const calculateAttributeNames = (
	variations: ProductVariationWithAttributes[] | undefined,
): string[] => {
	if (!variations) return [];

	const attributeNames = new Set<string>();
	variations.forEach((variation) => {
		variation.attributes.forEach((attr: VariationAttribute) => {
			attributeNames.add(attr.attributeId);
		});
	});

	return Array.from(attributeNames);
};

// Helper function to get default variation for a product
const getDefaultVariation = (
	product: ProductWithVariations,
): ProductVariationWithAttributes | null => {
	if (!product?.variations || !product.hasVariations) return null;

	const sortedVariations = sortVariationsForDisplay(product.variations);

	const requiredAttributeIds = new Set<string>();
	sortedVariations.forEach((variation) => {
		variation.attributes.forEach((attr: VariationAttribute) => {
			requiredAttributeIds.add(attr.attributeId);
		});
	});

	const requiredIds = Array.from(requiredAttributeIds);
	const completeVariation =
		requiredIds.length > 0
			? sortedVariations.find((variation) =>
					requiredIds.every((attrId) =>
						variation.attributes.some(
							(attr: VariationAttribute) => attr.attributeId === attrId,
						),
					),
				)
			: sortedVariations[0];

	return completeVariation || sortedVariations[0] || null;
};

// Helper function to convert variation attributes to URL search params
const getVariationSearchParams = (
	variation: ProductVariationWithAttributes | null,
	attributes: ProductAttribute[],
): Record<string, string> => {
	if (!variation) return {};

	const params: Record<string, string> = {};
	variation.attributes.forEach((attr: VariationAttribute) => {
		// Convert numeric attribute ID to slug for URL
		const attribute = attributes.find(
			(a) => a.id.toString() === attr.attributeId,
		);
		const paramName = attribute?.slug || attr.attributeId.toLowerCase();
		params[paramName] = attr.value;
	});

	return params;
};

// Memoize the entire ProductCard component to prevent unnecessary re-renders
const ProductCard = memo(
	({
		product,
		disableViewTransition = false,
	}: {
		product: ProductWithVariations;
		disableViewTransition?: boolean;
	}) => {
		const [isAddingToCart, setIsAddingToCart] = useState(false);
		const { addToCart } = useCart();
		const { prefetchProduct } = usePrefetch();
		const { data: attributes } = useProductAttributes();

		// Use the variation selection hook
		const { selectedVariation, selectedAttributes, selectVariation } =
			useVariationSelection({
				product,
				attributes: attributes || [], // Pass attributes for proper display
			});

	// Calculate default variation and search params for the Link
	const defaultVariation = useMemo(
		() => getDefaultVariation(product),
		[product],
	);

	// Memoize expensive calculations - must be before linkSearchParams
	const imageArray = useMemo(
		() => parseImages(product.images),
		[product.images],
	);

	// Link search params should NOT include hover state to prevent re-renders
	// The imageIndex will be handled by the product page based on its own state
	const linkSearchParams = useMemo(() => {
		const params = getVariationSearchParams(defaultVariation, attributes || []);
		// Don't add imageIndex here - it causes unnecessary re-renders
		// The product page will handle image selection
		return params;
	}, [defaultVariation, attributes]);

	// Get unique attribute values for a specific attribute ID - memoized
	const getUniqueAttributeValues = useCallback(
		(attributeId: string): string[] => {
			return calculateUniqueAttributeValues(product.variations, attributeId);
		},
		[product.variations],
	);

	// Calculate if the product is available to add to cart
	const isAvailable = useMemo(() => {
		return product.isActive;
	}, [product.isActive]);

	// Calculate current price based on selected variation
	const currentPrice = useMemo(() => {
		// If product has variations, always use variation price
		if (product.hasVariations) {
			return selectedVariation?.price || 0;
		}
		// If product price is zero, use variation price (if available)
		if (product.price === 0 && selectedVariation) {
			return selectedVariation.price;
		}
		return selectedVariation ? selectedVariation.price : product.price;
	}, [selectedVariation, product.price, product.hasVariations]);

	// Get attribute names to display in the card - memoized
	const attributeNames = useMemo(
		() => calculateAttributeNames(product.variations),
		[product.variations],
	);

	const handleAddToCart = useCallback(
		async (e: React.MouseEvent) => {
			e.preventDefault();
			if (!isAvailable) return;

			// Validate variation requirement
			if (product.hasVariations && !selectedVariation) {
				toast.error("Пожалуйста, выберите вариант");
				return;
			}

			setIsAddingToCart(true);

			try {
				// Get variation attributes for cart display
				const variationAttributes = selectedVariation?.attributes?.length
					? Object.fromEntries(
							selectedVariation.attributes.map((attr) => [
								attr.attributeId,
								attr.value,
							]),
						)
					: undefined;

				// Add to cart with enriched data for instant display
				addToCart({
					productId: product.id,
					quantity: 1,
					variationId: selectedVariation?.id,
					productName: product.name,
					productSlug: product.slug,
					price: selectedVariation?.price ?? product.price,
					images: product.images,
					discount: selectedVariation?.discount ?? product.discount,
					attributes: variationAttributes,
				});
			} catch (error) {
				console.error("Error adding to cart:", error);
				toast.error("Не удалось добавить товар в корзину");
			} finally {
				setIsAddingToCart(false);
			}
		},
		[isAvailable, addToCart, product, selectedVariation],
	);

		// Memoize the prefetch handler to prevent re-creating on every render
		// Use useCallback instead of useMemo for event handlers
		const handleMouseEnter = useCallback(() => {
			// Only prefetch - don't seed the cache as it causes re-renders
			// The prefetch will fetch the full product data from the server
			prefetchProduct(product.slug);
		}, [prefetchProduct, product.slug]);

		// Check if product is coming soon (not in the type, so we'll use a placeholder)

		return (
			<Link
				to="/product/$productId"
				params={{
					productId: product.slug,
				}}
				search={linkSearchParams}
				className="block h-full relative"
				preload="intent"
				viewTransition={true}
				onMouseEnter={handleMouseEnter}
			>
			<div
				className="w-full product-card overflow-hidden  group"
				id={styles.productCard}
			>
				<div className="bg-background flex flex-col">
					<div className="relative aspect-square overflow-hidden">
						<div>
							{/* Primary Image */}
							<div className="relative aspect-square flex items-center justify-center overflow-hidden">
								{imageArray.length > 0 ? (
									<div className="relative w-full h-full">
										{/* Loading skeleton, initially visible */}
										<div className="absolute inset-0 w-full h-full bfloor-img-skeleton">
											<Skeleton className="absolute inset-0 w-full h-full rounded-none" />
										</div>

										{/* Broken overlay, initially hidden - memoized for performance */}
										<BrokenImageFallback />

										{/* Primary Image */}
										<img
											src={`${ASSETS_BASE_URL}/${imageArray[0]}`}
											alt={product.name}
											loading="eager"
											className="absolute inset-0 w-full h-full object-cover object-center"
											style={
												disableViewTransition
													? undefined
													: // Always use primary image for view transition
														// The secondary image hover effect is handled by CSS only
														{
																viewTransitionName: `product-image-${product.slug}`,
															}
											}
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
										{/* (no always-visible fallback overlay here; shown only via .bfloor-img-fallback when onError) */}

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

						{/* Desktop Add to Cart button */}
						<Button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleAddToCart(e);
							}}
							variant="cart"
							disabled={!isAvailable}
							aria-label={!isAddingToCart ? "В корзину" : "Добавление…"}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								fill="none"
								viewBox="0 0 33 30"
								className="cart-icon"
							>
								<title>В корзину</title>
								<path
									d="M1.94531 1.80127H7.27113L11.9244 18.602C12.2844 19.9016 13.4671 20.8013 14.8156 20.8013H25.6376C26.9423 20.8013 28.0974 19.958 28.495 18.7154L31.9453 7.9303H19.0041"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<circle cx="13.4453" cy="27.3013" r="2.5" fill="currentColor" />
								<circle cx="26.4453" cy="27.3013" r="2.5" fill="currentColor" />
							</svg>
							{!isAddingToCart ? (
								<span>В корзину</span>
							) : (
								<span>Добавление…</span>
							)}
						</Button>
					</div>

					{/* Content Section */}
					<div className="flex flex-col h-auto md:h-full md:p-4 pb-4">
						{/* Info Section - with horizontal and top padding on mobile, no padding on desktop */}
						<div className="px-4 pt-4 md:px-0 md:pt-0 flex flex-col h-auto md:h-full">
							{/* Price */}
							<div className="flex flex-col mb-2">
								<div className="flex flex-wrap items-center w-full gap-2">
									<div className="flex flex-col items-baseline gap-0 shrink-0">
										{product.discount ? (
											<>
												<div className="whitespace-nowrap flex items-baseline gap-0.5">
													<span className="text-xl font-light">
														{Math.round(
															currentPrice *
															(1 - product.discount / 100)
														)}
													</span>
													<span className="text-xs  font-light text-muted-foreground">
														р
													</span>
												</div>
												<div className="flex items-center gap-1">
													<span className="text-sm line-through text-muted-foreground">
														{Math.round(currentPrice)}
													</span>
													<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
														-{product.discount}%
													</span>
												</div>
											</>
										) : (
											<div
												className="whitespace-nowrap flex items-baseline gap-0.5"
												style={
													disableViewTransition
														? undefined
														: {
																viewTransitionName: `product-price-${product.slug}`,
															}
												}
											>
												<span className="text-xl font-light">
													{Math.round(currentPrice)}
												</span>
												<span className="text-xs font-light text-muted-foreground">
													р
												</span>
											</div>
										)}
									</div>

									{/* Coming Soon removed */}
								</div>

								{/* Product Name */}
								<p
									className="text-foreground"
									style={
										disableViewTransition
											? undefined
											: {
													viewTransitionName: `product-name-${product.slug}`,
												}
									}
								>
									{product.name}
								</p>

								{/* Variations */}
								{product.hasVariations &&
									product.variations &&
									product.variations.length > 0 && (
										<div className="space-y-2">
											{attributeNames.map((attributeId: string) => (
												<FilterGroup
													key={attributeId}
													title={((): string => {
														const byId = getAttributeDisplayName(
															attributeId,
															attributes || [],
														);
														// If lookup by ID failed (returns the same value), try slug-to-name
														if (byId === attributeId) {
															return getAttributeNameFromSlug(
																attributeId,
																attributes || [],
															);
														}
														return byId;
													})()}
													options={getUniqueAttributeValues(attributeId)}
													selectedOptions={
														selectedAttributes[attributeId] || null
													}
													onOptionChange={(value: string | null) => {
														if (value) {
															selectVariation(attributeId, value);
														}
													}}
													showAllOption={false}
													variant="product"
												/>
											))}
										</div>
									)}
							</div>
						</div>

						{/* Mobile Add to Cart button - no horizontal padding, extends to edges */}
						<div className="md:hidden">
							<Button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleAddToCart(e);
								}}
								variant="cart-mobile"
								disabled={!isAvailable}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									fill="none"
									viewBox="0 0 33 30"
									className="cart-icon"
									aria-label="В корзину"
								>
									<title>Add to cart</title>
									<path
										d="M1.94531 1.80127H7.27113L11.9244 18.602C12.2844 19.9016 13.4671 20.8013 14.8156 20.8013H25.6376C26.9423 20.8013 28.0974 19.958 28.495 18.7154L31.9453 7.9303H19.0041"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<circle
										cx="13.4453"
										cy="27.3013"
										r="2.5"
										fill="currentColor"
									/>
									<circle
										cx="26.4453"
										cy="27.3013"
										r="2.5"
										fill="currentColor"
									/>
								</svg>
								{!isAddingToCart ? (
									<span>В корзину</span>
								) : (
									<span>Добавление…</span>
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
	},
);
ProductCard.displayName = "ProductCard";

export default ProductCard;
