import NumberFlow from "@number-flow/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "~/components/ui/dashboard/breadcrumb";
import { Skeleton } from "~/components/ui/dashboard/skeleton";
import { Button } from "~/components/ui/shared/Button";
import { Icon } from "~/components/ui/shared/Icon";
import ImageGallery from "~/components/ui/shared/ImageGallery";
import { Input } from "~/components/ui/shared/input";
import { Link } from "~/components/ui/shared/Link";
import {
	markdownComponents,
	rehypePlugins,
} from "~/components/ui/shared/MarkdownComponents";
import ProductSlider from "~/components/ui/shared/ProductSlider";
import { ProductPageSkeleton } from "~/components/ui/store/skeletons/ProductPageSkeleton";
import { VariationSelector } from "~/components/ui/store/VariationSelector";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { useProductAttributes } from "~/hooks/useProductAttributes";
import { useRecentlyVisitedProducts } from "~/hooks/useRecentlyVisitedProducts";
import { useVariationSelection } from "~/hooks/useVariationSelection";
import { useCart } from "~/lib/cartContext";
import {
	productAttributesQueryOptions,
	productQueryOptions,
	userDataQueryOptions,
} from "~/lib/queryOptions";
import type {
	ProductAttribute,
	ProductListItem,
	ProductVariationWithAttributes,
	ProductWithDetails,
	VariationAttribute,
} from "~/types";
import { formatContentForDisplay } from "~/utils/contentUtils";
import { seo } from "~/utils/seo";
import { getStoreProductsFromInfiniteCache } from "~/utils/storeCache";

/** Plain-text first chunk of description for meta tags (~155 chars, trimmed at word) */
const getDescriptionChunk = (raw: string, maxLen = 155): string => {
	if (!raw || typeof raw !== "string") return "";
	const oneLine = raw
		.replace(/\\n/g, "\n")
		.replace(/\n+/g, " ")
		// Strip markdown: [text](url) -> text, **bold** -> bold, *italic* -> italic, # header -> header, `code` -> code
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/#+\s*/g, "")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
	if (oneLine.length <= maxLen) return oneLine;
	const cut = oneLine.slice(0, maxLen);
	const lastSpace = cut.lastIndexOf(" ");
	return lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
};

// Helper function to find attribute by ID, slug, or name (reduces redundant lookups)
const findAttributeByIdOrSlugOrName = (
	attributeId: string,
	attributes: ProductAttribute[] | undefined,
): ProductAttribute | undefined => {
	if (!attributes || !attributes.length) return undefined;
	return attributes.find(
		(a) =>
			a.id.toString() === attributeId ||
			a.slug === attributeId ||
			a.name === attributeId,
	);
};

/**
 * Optimized cache lookup using Map-based utility for O(1) product ID lookup
 * Then finds by slug (O(n) where n = cached products, but much faster than nested loops)
 *
 * Performance: ~10-100ms faster than previous O(n×m) linear search through pages
 */
const getCachedProductFromStore = (
	queryClient: ReturnType<typeof useQueryClient>,
	productSlug: string,
): ProductListItem | null => {
	// Use optimized Map-based cache utility (O(1) ID lookup, then O(n) slug search)
	// This is much faster than the previous O(n×m) nested loop through pages
	const cachedProducts = getStoreProductsFromInfiniteCache(queryClient);
	return cachedProducts.find((product) => product.slug === productSlug) ?? null;
};

/**
 * Get cached product for detail page merge
 *
 * OPTIMIZATION: Don't parse images/attributes here - they'll be overwritten by
 * getProductDetailsBySlug anyway. This eliminates double parsing.
 *
 * The merge strategy:
 * - Uses cached product for variations (already parsed from list view)
 * - Uses details from getProductDetailsBySlug for everything else (already parsed)
 * - No double parsing needed!
 *
 * Type note: Cached product has images/attributes as strings (DB format), but
 * ProductWithDetails expects arrays. This is fine because details will overwrite
 * them with parsed arrays in the merge.
 */
const getCachedProductForDetails = (
	queryClient: ReturnType<typeof useQueryClient>,
	productSlug: string,
): ProductWithDetails | null => {
	const cachedProduct = getCachedProductFromStore(queryClient, productSlug);
	if (!cachedProduct) return null;

	// Return cached product with nulls for fields that will come from getProductDetailsBySlug
	// Don't parse images/attributes here - they'll be parsed once in getProductDetailsBySlug
	// and used in the merge. This eliminates double parsing.
	// Type assertion is safe because details will overwrite images/attributes with correct types
	// Cast through unknown first to handle incompatible types (images: string | null vs string[])
	return {
		...cachedProduct,
		// Images and attributes will be parsed by getProductDetailsBySlug and merged
		// Variations are already parsed from list view, so preserve them
		category: null,
		brand: null,
		collection: null,
		storeLocations: [],
	} as unknown as ProductWithDetails;
};

// Inline skeleton components for progressive loading
const DescriptionSkeleton = () => (
	<div className="space-y-3">
		<Skeleton className="h-4 w-full" />
		<Skeleton className="h-4 w-5/6" />
		<Skeleton className="h-4 w-4/5" />
	</div>
);

const DimensionsSkeleton = () => (
	<div className="space-y-2">
		<Skeleton className="h-4 w-full" />
		<Skeleton className="h-4 w-5/6" />
		<Skeleton className="h-4 w-4/5" />
	</div>
);

// Simple search params - no Zod needed for basic optional strings
const validateSearch = (search: Record<string, unknown>) => {
	// For now, we'll accept any string parameters as potential attributes
	// The actual validation will happen in the component using database attributes
	const result: Record<string, string | undefined> = {};

	Object.entries(search).forEach(([key, value]) => {
		if (typeof value === "string") {
			result[key] = value;
		}
	});

	return result;
};

// Error component for product page errors
function ProductErrorComponent({ error }: ErrorComponentProps) {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="max-w-md text-center">
				<h1 className="mb-4 font-bold text-4xl">Oops!</h1>
				<p className="mb-6 text-muted-foreground">
					Something went wrong while loading this product.
				</p>
				<div className="flex justify-center gap-3">
					<Button asChild size="lg">
						<Link href="/store">Browse Store</Link>
					</Button>
					<Button
						variant="outline"
						size="lg"
						onClick={() => window.location.reload()}
					>
						Try Again
					</Button>
				</div>
				{error && (
					<details className="mt-6 text-left">
						<summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
							Error details
						</summary>
						<pre className="mt-2 overflow-auto rounded bg-muted p-4 text-xs">
							{error.message}
						</pre>
					</details>
				)}
			</div>
		</div>
	);
}

// Not found component for product page
function ProductNotFoundComponent() {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="max-w-md text-center">
				<h1 className="mb-4 font-bold text-4xl">Product Not Found</h1>
				<p className="mb-6 text-muted-foreground">
					The product you're looking for doesn't exist or has been removed.
				</p>
				<div className="flex justify-center gap-3">
					<Button asChild size="lg">
						<Link href="/store">Browse Store</Link>
					</Button>
					<Button
						variant="outline"
						size="lg"
						onClick={() => window.history.back()}
					>
						Go Back
					</Button>
				</div>
			</div>
		</div>
	);
}

export const Route = createFileRoute("/product/$productId")({
	component: ProductPage,
	errorComponent: ProductErrorComponent,
	notFoundComponent: ProductNotFoundComponent,
	pendingComponent: ProductPageSkeleton,

	// Loader ensures data is available before component renders
	// ensureQueryData is smart:
	// - If data exists (from prefetch/cache) → returns immediately (instant!)
	// - If data is stale → returns cached, refetches in background
	// - If no data → fetches and waits (shows pendingComponent)
	loader: async ({ context: { queryClient }, params }) => {
		const cachedProduct = getCachedProductForDetails(
			queryClient,
			params.productId,
		);
		// Prefetch product data and attributes in parallel
		const [product] = await Promise.all([
			queryClient.ensureQueryData(
				productQueryOptions(params.productId, cachedProduct),
			),
			queryClient.ensureQueryData(productAttributesQueryOptions()),
		]);
		return { product };
	},

	head: ({ loaderData }) => {
		const product = loaderData?.product;
		const title = product?.name
			? `${product.name} - ${product.category?.name} - BeautyFloor`
			: "BeautyFloor";
		const description = product?.description
			? getDescriptionChunk(product.description)
			: "";
		return {
			meta: [
				...seo({
					title,
					description,
				}),
			],
		};
	},

	validateSearch,
	// Strip undefined values from URL to keep it clean
	search: {
		middlewares: [stripSearchParams({})],
	},
});

// Reusable Add to Cart section component props
type AddToCartSectionProps = {
	size?: "sm" | "lg";
	className?: string;
	currentDiscount: number | null;
	originalTotalPrice: number;
	totalPrice: number;
	handleAddToCart: () => void;
	canAddToCart: boolean;
};

// Reusable Add to Cart section component
function AddToCartSection({
	size = "lg",
	className = "",
	currentDiscount,
	originalTotalPrice,
	totalPrice,
	handleAddToCart,
	canAddToCart,
}: AddToCartSectionProps) {
	if (currentDiscount && currentDiscount > 0) {
		// With discount: Grid layout with button spanning both rows
		return (
			<motion.div
				className={`grid grid-cols-[auto_1fr] items-stretch gap-x-4 gap-y-1 rounded-lg bg-muted p-2 ${className}`}
				layout
				transition={{ duration: 0.3, ease: "easeInOut" }}
			>
				{/* Discount Row */}
				<div className="flex flex-nowrap items-baseline gap-4">
					<div className="shrink-0 text-left">Скидка</div>
					<span className="relative whitespace-nowrap font-digital-mono text-muted-foreground! text-xl after:absolute after:inset-x-0 after:top-1/2 after:h-[1.5px] after:bg-current">
						<NumberFlow
							value={Math.round(originalTotalPrice)}
							format={{ useGrouping: true }}
							suffix=" p"
						/>
					</span>
					<span className="whitespace-nowrap rounded-[5px] bg-accent px-2 py-1 font-digital-mono font-semibold text-accent-foreground! text-base">
						-{currentDiscount}%
					</span>
				</div>

				{/* Add to Cart Button - spans both rows */}
				<motion.div
					className="row-span-2 flex"
					layout
					transition={{ duration: 0.3, ease: "easeInOut" }}
				>
					<Button
						onClick={handleAddToCart}
						disabled={!canAddToCart}
						size={size}
						variant="default"
						className="h-full w-full"
					>
						{!canAddToCart ? "Недоступно" : "В корзину"}
					</Button>
				</motion.div>

				{/* Total Row */}
				<div className="flex flex-nowrap items-baseline gap-4">
					<div className="shrink-0 text-left">Итого</div>
					<span
						className={`${size === "lg" ? "text-4xl" : "text-2xl"} whitespace-nowrap font-bold font-digital-mono`}
					>
						<NumberFlow
							value={Math.round(totalPrice)}
							format={{ useGrouping: true }}
							suffix=" p"
						/>
					</span>
				</div>
			</motion.div>
		);
	}

	// Without discount: Label above price
	return (
		<motion.div
			className={`flex flex-row flex-nowrap items-stretch gap-4 rounded-lg bg-muted p-2 ${className}`}
			layout
			transition={{ duration: 0.3, ease: "easeInOut" }}
		>
			{/* Price Display - stacked vertically */}
			<div className="flex shrink-0 flex-col">
				<div className="whitespace-nowrap text-muted-foreground text-sm">
					Итого
				</div>
				<div
					className={`${size === "lg" ? "text-4xl" : "text-2xl"} whitespace-nowrap font-bold font-digital-mono`}
				>
					<NumberFlow
						value={Math.round(totalPrice)}
						format={{ useGrouping: true }}
						suffix=" p"
					/>
				</div>
			</div>

			{/* Add to Cart Button */}
			<motion.div
				className="flex flex-1"
				layout
				transition={{ duration: 0.3, ease: "easeInOut" }}
			>
				<Button
					onClick={handleAddToCart}
					disabled={!canAddToCart}
					size={size}
					className="h-full w-full"
				>
					{!canAddToCart ? "Недоступно" : "В корзину"}
				</Button>
			</motion.div>
		</motion.div>
	);
}

// Mobile fixed bar component props
type MobileFixedCartBarProps = {
	currentDiscount: number | null;
	originalTotalPrice: number;
	totalPrice: number;
	quantity: number;
	isFlooringProduct: boolean;
	getUnitShortLabel: (unit: string | undefined) => string;
	handleAddToCart: () => void;
	canAddToCart: boolean;
	productWithDetails: ProductWithDetails | null | undefined;
};

// Mobile fixed bar component (different layout - no rounded corners, compact)
function MobileFixedCartBar({
	currentDiscount,
	originalTotalPrice,
	totalPrice,
	quantity,
	isFlooringProduct,
	getUnitShortLabel,
	handleAddToCart,
	canAddToCart,
	productWithDetails,
}: MobileFixedCartBarProps) {
	if (currentDiscount && currentDiscount > 0) {
		return (
			<motion.div
				className="grid grid-cols-[auto_1fr] grid-rows-2 items-stretch border-primary border-t bg-muted shadow-lg"
				layout
				transition={{ duration: 0.3, ease: "easeInOut" }}
			>
				{/* Left column - Price info with padding, spans both rows */}
				<div className="row-span-2 flex min-w-0 flex-col justify-center space-y-1 px-2 py-2">
					{/* Discount Row */}
					<div className="flex flex-wrap items-baseline gap-2">
						<div className="whitespace-nowrap text-left">Скидка</div>
						<span className="relative whitespace-nowrap font-digital-mono text-base text-muted-foreground! after:absolute after:inset-x-0 after:top-1/2 after:h-[1.5px] after:bg-current">
							<NumberFlow
								value={Math.round(originalTotalPrice)}
								format={{ useGrouping: true }}
								suffix=" p"
							/>
						</span>
						<span className="whitespace-nowrap rounded-[5px] bg-accent px-2 py-1 font-digital-mono font-semibold text-accent-foreground! text-sm">
							-{currentDiscount}%
						</span>
					</div>

					{/* Total Row with quantity */}
					<div className="flex min-w-0 items-baseline justify-between gap-2">
						<div className="flex min-w-0 items-baseline gap-2">
							<div className="whitespace-nowrap text-left">Итого</div>
							<span className="whitespace-nowrap font-bold font-digital-mono text-2xl">
								<NumberFlow
									value={Math.round(totalPrice)}
									format={{ useGrouping: true }}
									suffix=" p"
								/>
							</span>
						</div>
						<div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap font-digital-mono text-muted-foreground text-sm">
							<span>
								<NumberFlow value={quantity} />
							</span>
							<span>
								{isFlooringProduct
									? "упак"
									: getUnitShortLabel(productWithDetails?.unitOfMeasurement)}
							</span>
						</div>
					</div>
				</div>

				{/* Add to Cart Button - spans both rows, flush with edges */}
				<motion.div
					className="row-span-2 flex"
					layout
					transition={{ duration: 0.3, ease: "easeInOut" }}
				>
					<Button
						onClick={handleAddToCart}
						disabled={!canAddToCart}
						size="sm"
						className="h-full w-full rounded-none"
					>
						{!canAddToCart ? "Недоступно" : "В корзину"}
					</Button>
				</motion.div>
			</motion.div>
		);
	}

	// Without discount
	return (
		<motion.div
			className="flex flex-row items-stretch border-border border-t bg-muted shadow-lg"
			layout
			transition={{ duration: 0.3, ease: "easeInOut" }}
		>
			{/* Price Display with quantity */}
			<div className="flex min-w-0 flex-col px-2 py-2">
				<div className="flex items-baseline justify-between gap-2">
					<div className="whitespace-nowrap text-muted-foreground text-sm">
						Итого
					</div>
					<div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap font-digital-mono text-muted-foreground text-sm">
						<span>
							<NumberFlow value={quantity} />
						</span>
						<span>
							{isFlooringProduct
								? "упак"
								: getUnitShortLabel(productWithDetails?.unitOfMeasurement)}
						</span>
					</div>
				</div>
				<div className="flex items-baseline">
					<span className="whitespace-nowrap font-bold font-digital-mono text-2xl">
						<NumberFlow
							value={Math.round(totalPrice)}
							format={{ useGrouping: true }}
							suffix=" p"
						/>
					</span>
				</div>
			</div>

			{/* Add to Cart Button - flush with edges */}
			<motion.div
				className="flex flex-1"
				layout
				transition={{ duration: 0.3, ease: "easeInOut" }}
			>
				<Button
					onClick={handleAddToCart}
					disabled={!canAddToCart}
					size="sm"
					className="h-full w-full rounded-none"
				>
					{!canAddToCart ? "Недоступно" : "В корзину"}
				</Button>
			</motion.div>
		</motion.div>
	);
}

function ProductPage() {
	const { productId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [quantity, setQuantity] = useState(1);

	const { addToCart } = useCart();
	const { data: attributes } = useProductAttributes();
	const queryClient = useQueryClient();

	// Parse initial image index from search params (for view transitions)
	const initialImageIndex = useMemo(() => {
		const imageIndexStr = search.imageIndex;
		if (imageIndexStr) {
			const parsed = Number.parseInt(imageIndexStr, 10);
			return Number.isNaN(parsed) ? 0 : parsed;
		}
		return 0;
	}, [search.imageIndex]);
	const {
		addRecentlyVisited,
		getRecentlyVisitedProductIds,
		hasRecentlyVisited,
	} = useRecentlyVisitedProducts();

	// Check if user is admin - read from cache (prefetched at root level)
	const userData = queryClient.getQueryData(userDataQueryOptions().queryKey) as
		| { isAdmin?: boolean }
		| undefined;
	const isAdmin = userData?.isAdmin ?? false;

	const cachedProduct = useMemo(
		() => getCachedProductForDetails(queryClient, productId),
		[queryClient, productId],
	);

	const { data: productWithDetails, isFetching: isFetchingProduct } =
		useSuspenseQuery(productQueryOptions(productId, cachedProduct));

	// Track product visit when route param changes and product data is available
	// The hook handles deduplication automatically, so we don't need a ref
	useEffect(() => {
		if (productId && productWithDetails?.id && productWithDetails?.slug) {
			addRecentlyVisited(productWithDetails.id, productWithDetails.slug);
		}
	}, [
		productId,
		productWithDetails?.id,
		productWithDetails?.slug,
		addRecentlyVisited,
	]);

	// Get recently visited product IDs (excluding current product)
	const recentlyVisitedProductIds = useMemo(() => {
		const allIds = getRecentlyVisitedProductIds();
		// Exclude current product from recently visited list
		if (productWithDetails?.id) {
			return allIds.filter((id) => id !== productWithDetails.id);
		}
		return allIds;
	}, [getRecentlyVisitedProductIds, productWithDetails?.id]);

	// Determine if product is flooring (sold in packs with area in m²)
	const isFlooringProduct = Boolean(productWithDetails?.squareMetersPerPack);

	// Map full unit names to short labels for UI display
	const getUnitShortLabel = (unit: string | undefined): string => {
		if (!unit) return "шт";
		const normalized = unit.trim().toLowerCase();
		switch (normalized) {
			case "квадратный метр":
				return "м²";
			case "погонный метр":
				return "м.п.";
			case "литр":
				return "л";
			case "штука":
				return "шт";
			case "упаковка":
				return "упак";
			default:
				return unit; // fallback to raw value if unknown
		}
	};

	// Auto-select first variation if no search params and product has variations
	// This runs once when product loads and no search params exist
	useEffect(() => {
		if (
			!productWithDetails?.hasVariations ||
			!productWithDetails.variations?.length
		)
			return;

		// Check if any search params are set
		const hasAnySearchParams = Object.values(search).some(
			(value) => value !== undefined,
		);
		if (hasAnySearchParams) return;

		// Find first variation by sort order (smallest first)
		const sortedVariations = [...productWithDetails.variations].sort((a, b) => {
			return (a.sort ?? 0) - (b.sort ?? 0);
		});

		const firstVariation = sortedVariations[0];
		if (firstVariation?.attributes?.length > 0) {
			// Build search params dynamically from first variation's attributes
			const autoSearchParams: Record<string, string | undefined> = {};

			firstVariation.attributes.forEach((attr: VariationAttribute) => {
				// Convert attribute name to slug for URL
				const attribute = findAttributeByIdOrSlugOrName(
					attr.attributeId,
					attributes,
				);
				const slug =
					attribute?.slug || attr.attributeId.toLowerCase().replace(/_/g, "-");
				autoSearchParams[slug] = attr.value;
			});

			// Navigate with auto-selected variation
			navigate({
				search: autoSearchParams as Record<string, string | undefined>,
				replace: true,
			});
		}
	}, [productWithDetails, search, navigate, attributes]);

	// Use variation selection hook with URL state for product page
	const { selectedVariation, selectedAttributes } = useVariationSelection({
		product: productWithDetails as unknown as ProductListItem | null,
		search, // Providing search enables URL state mode
		onVariationChange: () => setQuantity(1), // Reset quantity when variation changes
		attributes: attributes || [], // Pass database attributes for slug conversion
	});

	// Calculate current price based on selected variation
	// selectedVariation already finds the matching variation regardless of stock status
	const currentPrice = useMemo(() => {
		if (!productWithDetails) return 0;
		// If product has variations, always use variation price
		if (productWithDetails.hasVariations) {
			return selectedVariation?.price || 0;
		}
		// If product price is zero, use variation price (if available)
		if (productWithDetails.price === 0 && selectedVariation) {
			return selectedVariation.price || 0;
		}
		return productWithDetails.price || 0;
	}, [selectedVariation, productWithDetails]);

	// Calculate current discount based on selected variation
	const currentDiscount = useMemo(() => {
		if (selectedVariation?.discount) {
			return selectedVariation.discount;
		}
		return productWithDetails?.discount || null;
	}, [selectedVariation, productWithDetails?.discount]);

	// Calculate discounted price (the actual price to display)
	const displayPrice = useMemo(() => {
		if (currentDiscount && currentDiscount > 0) {
			return currentPrice * (1 - currentDiscount / 100);
		}
		return currentPrice;
	}, [currentPrice, currentDiscount]);

	// Check if product can be added to cart
	const canAddToCart = useMemo(() => {
		if (!productWithDetails?.isActive) return false;
		if (productWithDetails.hasVariations && !selectedVariation) return false;
		return true;
	}, [productWithDetails, selectedVariation]);

	// Define all callbacks before any conditional returns
	const incrementQuantity = useCallback(() => {
		setQuantity((prev) => prev + 1);
	}, []);

	const decrementQuantity = useCallback(() => {
		if (quantity > 1) {
			setQuantity((prev) => prev - 1);
		}
	}, [quantity]);

	const handleQuantityChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			// Allow empty input while typing
			if (value === "") {
				setQuantity(1);
				return;
			}
			const numValue = parseInt(value, 10);
			if (!Number.isNaN(numValue) && numValue > 0) {
				setQuantity(numValue);
			}
		},
		[],
	);

	// Handle add to cart
	const handleAttributeChange = useCallback(
		(attributeId: string, value: string) => {
			const newSearch = { ...search };

			// Convert attribute name to slug for URL
			const attribute = findAttributeByIdOrSlugOrName(attributeId, attributes);
			const slug =
				attribute?.slug || attributeId.toLowerCase().replace(/_/g, "-");

			newSearch[slug] = value;

			// Remove undefined values
			Object.keys(newSearch).forEach((key) => {
				if (newSearch[key] === undefined) {
					delete newSearch[key];
				}
			});

			navigate({
				search: newSearch as Record<string, string | undefined>,
				replace: true,
			});
		},
		[search, navigate, attributes],
	);

	const handleAddToCart = useCallback(async () => {
		if (!productWithDetails || !canAddToCart) return;

		// Validate variation requirement
		if (productWithDetails.hasVariations && !selectedVariation) {
			toast.error("Пожалуйста, выберите вариант");
			return;
		}

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
				productId: productWithDetails.id,
				quantity,
				variationId: selectedVariation?.id,
				productName: productWithDetails.name,
				productSlug: productWithDetails.slug,
				price: selectedVariation?.price ?? productWithDetails.price,
				images: productWithDetails.images,
				discount: selectedVariation?.discount ?? productWithDetails.discount,
				attributes: variationAttributes,
				squareMetersPerPack: productWithDetails.squareMetersPerPack,
			});
			setQuantity(1); // Reset quantity after successful add
		} catch (error) {
			console.error("Error adding to cart:", error);
			toast.error("Не удалось добавить товар в корзину");
		}
	}, [
		productWithDetails,
		quantity,
		selectedVariation,
		canAddToCart,
		addToCart,
	]);

	// Calculate total price for display
	// For flooring products: price per m² × square meters per pack × quantity
	// For other products: price × quantity
	// Always apply discount if present
	const totalPrice = useMemo(() => {
		const pricePerUnit = productWithDetails?.squareMetersPerPack
			? displayPrice * productWithDetails.squareMetersPerPack
			: displayPrice;

		return pricePerUnit * quantity;
	}, [displayPrice, productWithDetails?.squareMetersPerPack, quantity]);

	// Calculate original total price (without discount) for the entire order
	const originalTotalPrice = useMemo(() => {
		const pricePerUnit = productWithDetails?.squareMetersPerPack
			? currentPrice * productWithDetails.squareMetersPerPack
			: currentPrice;

		return pricePerUnit * quantity;
	}, [currentPrice, productWithDetails?.squareMetersPerPack, quantity]);

	// Get images array - should already be an array from server
	const productImages = useMemo(() => {
		if (!productWithDetails?.images) return [];

		// Images should already be an array from the server
		if (Array.isArray(productWithDetails.images)) {
			return productWithDetails.images;
		}

		// Fallback: try parsing if it's somehow a string (backward compatibility)
		if (typeof productWithDetails.images === "string") {
			try {
				return JSON.parse(productWithDetails.images) as string[];
			} catch {
				return [];
			}
		}

		return [];
	}, [productWithDetails?.images]);

	// Show skeleton while loading
	// Data is guaranteed by loader + useSuspenseQuery
	// No need for loading checks - data is always available!
	// pendingComponent handles the loading state automatically

	return (
		<div className="min-h-screen bg-background">
			{/* Desktop: Full-width gallery with overlay sticky product info */}
			<div className="hidden lg:block">
				{/* Wrapper that spans full height for sticky positioning */}
				<div className="relative">
					{/* Full-width Image Gallery */}
					<div className="relative z-0 w-full">
						<ImageGallery
							images={productImages}
							alt={productWithDetails?.name || "Product"}
							productSlug={productWithDetails?.slug}
							size="default"
							initialImageIndex={initialImageIndex}
						/>
					</div>

					{/* Sticky Product Info Panel - Overlay on top of gallery, then sticks */}
					<div
						className="pointer-events-none absolute top-0 right-0 h-full w-full"
						style={{
							zIndex: 9999,
						}}
					>
						<div className="pointer-events-auto sticky top-16 ml-auto h-fit w-fit max-w-[50%]">
							<div className="flex items-start justify-end p-6">
								<div
									className="product-info-overlay product-info-reveal pointer-events-auto relative w-fit max-w-[48vw] rounded-lg border border-border p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]"
									style={{
										viewTransitionName: "product-info-container",
									}}
								>
									{/* Admin Edit Button - Top Right Corner */}
									{isAdmin && productWithDetails?.id && (
										<div className="absolute top-4 right-4">
											<Button
												asChild
												variant="outline"
												size="sm"
												className="flex items-center gap-2"
											>
												<Link
													href={`/dashboard/products/${productWithDetails.id}/edit`}
												>
													<Icon name="edit" size={16} />
													<span>Редактировать</span>
												</Link>
											</Button>
										</div>
									)}
									<div className="space-y-6">
										{/* Breadcrumb Navigation */}
										<div className="[contain:inline-size]">
											<Breadcrumb>
												<BreadcrumbList>
													<BreadcrumbItem>
														<BreadcrumbLink asChild>
															<Link
																href="/"
																className="text-muted-foreground hover:text-foreground"
															>
																Главная
															</Link>
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem>
														<BreadcrumbLink asChild>
															<Link
																href="/store"
																className="text-muted-foreground hover:text-foreground"
															>
																Ламинат
															</Link>
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem>
														<BreadcrumbPage className="text-muted-foreground">
															{productWithDetails?.name}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</BreadcrumbList>
											</Breadcrumb>
										</div>

										{/* Product Title */}
										<div className="[contain:inline-size]">
											<h1 className="text-2xl! leading-[1.1]">
												{productWithDetails?.name || "Product"}
											</h1>
											<div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm">
												{/* Brand Logo/Name */}
												{productWithDetails?.brand && (
													<Link
														href={`/store/${productWithDetails.brand.slug}`}
														className="flex items-center gap-2"
													>
														{productWithDetails.brand.image ? (
															<img
																src={`${ASSETS_BASE_URL}/${productWithDetails.brand.image}`}
																alt={productWithDetails.brand.name}
																className="h-6 w-auto"
															/>
														) : (
															<span className="font-medium">
																{productWithDetails.brand.name}
															</span>
														)}
													</Link>
												)}

												{/* SKU */}
												{productWithDetails?.sku && (
													<div className="flex items-center gap-1">
														<span className="text-foreground-muted">
															Артикул:
														</span>

														{productWithDetails.sku}
													</div>
												)}

												{/* Country of Origin */}
												{productWithDetails?.brand?.country && (
													<div className="flex items-center gap-1.5">
														{productWithDetails.brand.country.flagImage && (
															<img
																src={`${ASSETS_BASE_URL}/${productWithDetails.brand.country.flagImage}`}
																alt={productWithDetails.brand.country.name}
																className="h-4 w-auto"
															/>
														)}
														<span className="font-semibold">
															{productWithDetails.brand.country.name}
														</span>
														<span className="text-gray-500">родина бренда</span>
													</div>
												)}

												{/* Collection */}
												{productWithDetails?.collection && (
													<div className="flex items-center gap-1">
														<span className="text-foreground-muted">
															Коллекция:
														</span>
														<Link
															href={`/store?collection=${productWithDetails.collection.slug}`}
															className="font-semibold"
														>
															{productWithDetails.collection.name}
														</Link>
													</div>
												)}
											</div>
										</div>

										{/* Wrapper for Price, Quantity, and Add to Cart */}
										<div className="w-fit space-y-4">
											{/* Price and Quantity */}
											<div className="flex flex-nowrap items-stretch gap-0">
												{/* Price Box */}
												<div className="flex shrink-0 flex-col items-start justify-center rounded-lg bg-muted px-4 py-3 text-left">
													<div className="mb-1 whitespace-nowrap text-muted-foreground text-sm">
														Цена за{" "}
														<span className="whitespace-nowrap">
															{isFlooringProduct
																? "м²"
																: getUnitShortLabel(
																		productWithDetails?.unitOfMeasurement,
																	)}
														</span>
													</div>
													{currentDiscount && currentDiscount > 0 && (
														<div className="relative mb-1 whitespace-nowrap font-digital-mono text-base text-muted-foreground! after:absolute after:inset-x-0 after:top-1/2 after:h-[1.5px] after:bg-current">
															<NumberFlow
																value={Math.round(currentPrice)}
																format={{ useGrouping: true }}
																suffix=" p"
															/>
														</div>
													)}
													<div className="whitespace-nowrap font-bold font-digital-mono text-3xl text-foreground leading-tight!">
														<NumberFlow
															value={Math.round(displayPrice)}
															format={{ useGrouping: true }}
															suffix=" p"
														/>
													</div>
												</div>

												{/* Icon divider */}
												<div className="flex shrink-0 items-center justify-center px-1">
													<Icon
														name="plus"
														size={28}
														className="rotate-45 text-foreground-muted"
													/>
												</div>

												{/* Quantity Selector */}
												<div className="flex flex-col self-stretch">
													<div className="relative flex flex-1 items-center justify-center rounded-lg bg-muted px-1 py-1">
														{/* Minus button */}
														<Button
															type="button"
															variant="quantity"
															className="shrink-0"
															onClick={decrementQuantity}
															disabled={quantity <= 1}
														>
															<Icon name="minus" size={14} />
														</Button>

														{/* Center content */}
														<div className="flex flex-col items-center justify-center gap-1 px-1">
															{productWithDetails?.squareMetersPerPack && (
																<div className="flex w-full flex-col items-center justify-center gap-0">
																	<div className="whitespace-nowrap font-digital-mono font-normal text-foreground text-xl sm:text-2xl">
																		<NumberFlow
																			value={
																				quantity *
																				productWithDetails.squareMetersPerPack
																			}
																			format={{
																				minimumFractionDigits: 0,
																				maximumFractionDigits: 3,
																			}}
																		/>
																	</div>
																	<div className="-mt-1 whitespace-nowrap font-normal text-muted-foreground text-xs sm:text-sm">
																		Площадь{" "}
																		<span className="text-foreground">м²</span>
																	</div>
																</div>
															)}
															<div className="flex w-full flex-col items-center justify-center gap-0 pb-0.5">
																<Input
																	type="number"
																	min={1}
																	value={quantity}
																	onChange={handleQuantityChange}
																	className="field-sizing-content m-0 h-auto w-auto min-w-[2ch] max-w-[8ch] border-0 bg-transparent p-0 text-center font-digital-mono font-normal text-xl shadow-none [appearance:textfield] focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-2xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
																/>
																{isFlooringProduct && (
																	<div className="-mt-3.5 whitespace-nowrap font-normal text-muted-foreground text-xs sm:text-sm">
																		Упаковок
																	</div>
																)}
															</div>
														</div>

														{/* Plus button */}
														<Button
															type="button"
															variant="quantity"
															className="shrink-0"
															onClick={incrementQuantity}
														>
															<Icon name="plus" size={14} />
														</Button>
													</div>
												</div>
											</div>

											{/* Variation Selector */}
											{productWithDetails?.hasVariations && (
												<div className="[contain:inline-size]">
													<VariationSelector
														product={
															productWithDetails as unknown as ProductListItem
														}
														selectedAttributes={selectedAttributes}
														search={search}
														onAttributeChange={handleAttributeChange}
													/>
												</div>
											)}

											{/* Price and Add to Cart */}
											<AddToCartSection
												size="lg"
												className="[contain:inline-size]"
												currentDiscount={currentDiscount}
												originalTotalPrice={originalTotalPrice}
												totalPrice={totalPrice}
												handleAddToCart={handleAddToCart}
												canAddToCart={canAddToCart}
											/>

											{/* Store Locations */}
											{productWithDetails?.storeLocations &&
												productWithDetails.storeLocations.length > 0 && (
													<div className="text-sm [contain:inline-size]">
														<span className="text-foreground-muted">
															Доступно в магазинах:{" "}
														</span>
														<span className="text-foreground">
															{productWithDetails.storeLocations?.map(
																(location, index) => (
																	<span key={location.id}>
																		<Link
																			href="/contact"
																			className="text-accent"
																		>
																			{location.address}
																		</Link>
																		{index <
																			(productWithDetails.storeLocations
																				?.length ?? 0) -
																				1 && ", "}
																	</span>
																),
															)}
														</span>
													</div>
												)}
										</div>

										{/* Important Note */}
										{productWithDetails?.importantNote && (
											<div className="prose max-w-none [contain:inline-size]">
												<ReactMarkdown
													components={markdownComponents}
													rehypePlugins={rehypePlugins}
												>
													{formatContentForDisplay(
														productWithDetails?.importantNote ?? "",
													)}
												</ReactMarkdown>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Description and Characteristics Section */}
					{(productWithDetails?.description ||
						productWithDetails?.hasVariations ||
						(productWithDetails?.productAttributes &&
							Array.isArray(productWithDetails.productAttributes) &&
							productWithDetails.productAttributes.length > 0)) && (
						<div className="mx-auto max-w-7xl px-4 py-8 lg:pr-[45%]">
							<div className="flex flex-col gap-8">
								{/* Characteristics */}
								{(productWithDetails?.hasVariations ||
									(productWithDetails?.productAttributes &&
										Array.isArray(productWithDetails.productAttributes) &&
										productWithDetails.productAttributes.length > 0)) && (
									<div className="space-y-4">
										<h2>Характеристики</h2>
										<div>
											{/* Product-level attributes - only show standardized attributes */}
											{(productWithDetails?.productAttributes ?? [])
												// Filter to only show attributes that exist in the standardized list
												.filter(
													(attr: { attributeId: string; value: string }) => {
														if (!attributes || !attributes.length) return false;
														// Check if attribute is in the standardized list
														const attribute = findAttributeByIdOrSlugOrName(
															attr.attributeId,
															attributes,
														);
														// Only show if it's a standardized attribute
														if (!attribute) return false;
														// Exclude Толщина (thickness) from characteristics - it should be in dimensions
														const attributeNameLower =
															attribute.name.toLowerCase();
														const attributeSlugLower =
															attribute.slug.toLowerCase();
														if (
															attributeNameLower.includes("толщина") ||
															attributeSlugLower.includes("thickness")
														) {
															return false;
														}
														return true;
													},
												)
												.map((attr: { attributeId: string; value: string }) => {
													const attribute = findAttributeByIdOrSlugOrName(
														attr.attributeId,
														attributes,
													);
													const displayName = attribute
														? attribute.name
														: attr.attributeId;

													return (
														<div
															key={attr.attributeId}
															className="flex items-center justify-between py-2"
														>
															<span className="text-foreground-muted">
																{displayName}
															</span>
															<span>{attr.value}</span>
														</div>
													);
												})}

											{/* Variation attributes */}
											{productWithDetails?.hasVariations &&
												(() => {
													// Use selectedVariation directly (already has all attributes)
													// Fallback to first variation if no selection
													const productWithVariations =
														productWithDetails as unknown as ProductListItem;
													const variationToShow:
														| ProductVariationWithAttributes
														| undefined =
														(selectedVariation as ProductVariationWithAttributes | null) ||
														productWithVariations.variations?.[0];

													if (!variationToShow?.attributes) return null;

													return variationToShow.attributes
														.filter((attr: VariationAttribute) => {
															const attribute = findAttributeByIdOrSlugOrName(
																attr.attributeId,
																attributes,
															);
															if (!attribute) return true; // Keep if not found in standardized list
															// Exclude Толщина (thickness) from characteristics - it should be in dimensions
															const attributeNameLower =
																attribute.name.toLowerCase();
															const attributeSlugLower =
																attribute.slug.toLowerCase();
															return !(
																attributeNameLower.includes("толщина") ||
																attributeSlugLower.includes("thickness")
															);
														})
														.map((attr: VariationAttribute) => {
															const attribute = findAttributeByIdOrSlugOrName(
																attr.attributeId,
																attributes,
															);
															const displayName = attribute
																? attribute.name
																: attr.attributeId;

															return (
																<div
																	key={attr.attributeId}
																	className="flex items-center justify-between py-2"
																>
																	<span className="font-normal text-foreground-muted">
																		{displayName}
																	</span>
																	<span className="font-normal text-foreground">
																		{attr.value}
																	</span>
																</div>
															);
														});
												})()}
										</div>
									</div>
								)}

								{/* Dimensions */}
								{productWithDetails?.dimensions ? (
									<div className="space-y-4">
										<h3>Габариты</h3>
										<div>
											{productWithDetails.dimensions
												.split("\n")
												.filter((line) => line.trim())
												.map((line) => {
													const [label, ...valueParts] = line.split(":");
													const value = valueParts.join(":").trim();
													const trimmedLabel = label.trim();
													return (
														<div
															key={`${trimmedLabel}-${value}`}
															className="flex items-center justify-between py-2"
														>
															<span className="text-foreground-muted">
																{trimmedLabel}
															</span>
															<span>{value}</span>
														</div>
													);
												})}
										</div>
									</div>
								) : isFetchingProduct ? (
									<div className="space-y-4">
										<h3>Габариты</h3>
										<DimensionsSkeleton />
									</div>
								) : null}

								{/* Description */}
								{productWithDetails?.description ? (
									<div className="space-y-4">
										<h2>Описание</h2>
										<div className="prose max-w-none">
											<ReactMarkdown
												components={markdownComponents}
												rehypePlugins={rehypePlugins}
											>
												{productWithDetails?.description?.replace(
													/\\n/g,
													"\n",
												) ?? ""}
											</ReactMarkdown>
										</div>
									</div>
								) : isFetchingProduct ? (
									<div className="space-y-4">
										<h2>Описание</h2>
										<DescriptionSkeleton />
									</div>
								) : null}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Mobile: Standard layout */}
			<div className="lg:hidden">
				{/* Image Gallery - edge-to-edge, no padding */}
				<div className="w-full">
					<ImageGallery
						images={productImages}
						alt={productWithDetails?.name || "Product"}
						productSlug={productWithDetails?.slug}
						size="default"
						initialImageIndex={initialImageIndex}
					/>
				</div>

				{/* Rest of content with padding - add bottom padding for fixed price bar on mobile only */}
				<div className="mx-auto max-w-7xl px-4 py-8 pb-8">
					<div className="flex flex-col gap-8">
						{/* Product Info */}
						<div className="w-full">
							<div className="space-y-6">
								{/* Breadcrumb Navigation */}
								<div>
									<Breadcrumb>
										<BreadcrumbList>
											<BreadcrumbItem>
												<BreadcrumbLink asChild>
													<Link
														href="/"
														className="text-muted-foreground hover:text-foreground"
													>
														Главная
													</Link>
												</BreadcrumbLink>
											</BreadcrumbItem>
											<BreadcrumbSeparator />
											<BreadcrumbItem>
												<BreadcrumbLink asChild>
													<Link
														href="/store"
														className="text-muted-foreground hover:text-foreground"
													>
														Ламинат
													</Link>
												</BreadcrumbLink>
											</BreadcrumbItem>
											<BreadcrumbSeparator />
											<BreadcrumbItem>
												<BreadcrumbPage className="text-muted-foreground">
													{productWithDetails?.name}
												</BreadcrumbPage>
											</BreadcrumbItem>
										</BreadcrumbList>
									</Breadcrumb>
								</div>

								{/* Product Title */}
								<div>
									<h1 className="text-2xl! leading-[1.1]">
										{productWithDetails?.name || "Product"}
									</h1>
									<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-600 text-sm">
										{/* Brand Logo/Name */}
										{productWithDetails?.brand && (
											<Link
												href={`/store/${productWithDetails.brand.slug}`}
												className="flex items-center gap-2"
											>
												{productWithDetails.brand.image ? (
													<img
														src={`${ASSETS_BASE_URL}/${productWithDetails.brand.image}`}
														alt={productWithDetails.brand.name}
														className="h-6 w-auto"
													/>
												) : (
													<span className="font-medium">
														{productWithDetails.brand.name}
													</span>
												)}
											</Link>
										)}

										{/* SKU */}
										{productWithDetails?.sku && (
											<div className="flex items-center gap-1">
												<span className="text-gray-500">Артикул:</span>

												{productWithDetails.sku}
											</div>
										)}

										{/* Country of Origin */}
										{productWithDetails?.brand?.country && (
											<div className="flex items-center gap-1.5">
												{productWithDetails.brand.country.flagImage && (
													<img
														src={`${ASSETS_BASE_URL}/${productWithDetails.brand.country.flagImage}`}
														alt={productWithDetails.brand.country.name}
														className="h-4 w-auto"
													/>
												)}
												<span className="font-semibold">
													{productWithDetails.brand.country.name}
												</span>
												<span className="text-gray-500">родина бренда</span>
											</div>
										)}

										{/* Collection */}
										{productWithDetails?.collection && (
											<div className="flex items-center gap-1">
												<span className="text-gray-500">Коллекция:</span>
												<Link
													href={`/store?collection=${productWithDetails.collection.slug}`}
													className="font-semibold"
												>
													{productWithDetails.collection.name}
												</Link>
											</div>
										)}
									</div>
								</div>

								{/* Wrapper for Price, Quantity, and Add to Cart */}
								<div className="@container min-w-0 space-y-4 rounded-lg border border-border p-2">
									{/* Price and Quantity */}
									<div>
										<div className="flex w-full min-w-0 flex-wrap items-stretch gap-0">
											{/* Price Box */}
											<div className="flex @[38ch]:w-auto w-full flex-col @[38ch]:items-start items-center justify-center rounded-lg bg-muted px-4 py-3 @[38ch]:text-left text-center">
												<div className="mb-1 text-muted-foreground text-sm">
													Цена за{" "}
													<span className="whitespace-nowrap">
														{isFlooringProduct
															? "м²"
															: getUnitShortLabel(
																	productWithDetails?.unitOfMeasurement,
																)}
													</span>
												</div>
												{currentDiscount && currentDiscount > 0 && (
													<div className="relative mb-1 font-digital-mono text-base text-muted-foreground! after:absolute after:inset-x-0 after:top-1/2 after:h-[1.5px] after:bg-current">
														<NumberFlow
															value={Math.round(currentPrice)}
															format={{ useGrouping: true }}
															suffix=" p"
														/>
													</div>
												)}
												<div className="font-bold font-digital-mono text-3xl text-gray-800">
													<NumberFlow
														value={Math.round(displayPrice)}
														format={{ useGrouping: true }}
														suffix=" p"
													/>
												</div>
											</div>

											{/* Icon divider - horizontal (shown when both blocks fit in one row) */}
											<div className="@[38ch]:flex hidden shrink-0 items-center justify-center px-1">
												<Icon
													name="plus"
													size={28}
													className="rotate-45 text-foreground-muted"
												/>
											</div>

											{/* Icon divider - vertical (shown when stacked) */}
											<div className="flex @[38ch]:hidden w-full justify-center py-2">
												<Icon
													name="plus"
													size={28}
													className="rotate-45 text-foreground-muted"
												/>
											</div>

											{/* Quantity Selector */}
											<div className="flex @[38ch]:w-auto w-full min-w-[20ch] flex-1 flex-col self-stretch">
												<div className="relative flex w-full flex-1 items-center justify-center rounded-lg bg-muted px-1 py-1">
													{/* Minus button */}
													<Button
														type="button"
														variant="quantity"
														onClick={decrementQuantity}
														disabled={quantity <= 1}
													>
														<Icon name="minus" size={14} />
													</Button>

													{/* Center content */}
													<div className="flex flex-1 flex-col items-center justify-center gap-1">
														{productWithDetails?.squareMetersPerPack && (
															<div className="flex w-full flex-col items-center justify-center gap-0">
																<div className="whitespace-nowrap font-digital-mono font-normal text-foreground text-xl sm:text-2xl">
																	<NumberFlow
																		value={
																			quantity *
																			productWithDetails.squareMetersPerPack
																		}
																		format={{
																			minimumFractionDigits: 0,
																			maximumFractionDigits: 3,
																		}}
																	/>
																</div>
																<div className="-mt-1 whitespace-nowrap font-normal text-muted-foreground text-xs sm:text-sm">
																	Площадь{" "}
																	<span className="text-foreground">м²</span>
																</div>
															</div>
														)}
														<div className="flex w-full flex-col items-center justify-center gap-0 pb-0.5">
															<Input
																type="number"
																min={1}
																value={quantity}
																onChange={handleQuantityChange}
																className="field-sizing-content m-0 h-auto w-auto min-w-[4ch] max-w-[8ch] border-0 bg-transparent p-0 text-center font-digital-mono font-normal text-xl shadow-none [appearance:textfield] focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-2xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
															/>
															{isFlooringProduct && (
																<div className="-mt-3.5 whitespace-nowrap font-normal text-muted-foreground text-xs sm:text-sm">
																	Упаковок
																</div>
															)}
														</div>
													</div>

													{/* Plus button */}
													<Button
														type="button"
														variant="quantity"
														onClick={incrementQuantity}
													>
														<Icon name="plus" size={14} />
													</Button>
												</div>
											</div>
										</div>
									</div>

									{/* Variation Selector */}
									{productWithDetails?.hasVariations && (
										<VariationSelector
											product={productWithDetails as unknown as ProductListItem}
											selectedAttributes={selectedAttributes}
											search={search}
											onAttributeChange={handleAttributeChange}
										/>
									)}

									{/* Price and Add to Cart - Hidden on mobile (shown in fixed bar), visible on tablet */}
									<div className="hidden md:block">
										<AddToCartSection
											size="sm"
											currentDiscount={currentDiscount}
											originalTotalPrice={originalTotalPrice}
											totalPrice={totalPrice}
											handleAddToCart={handleAddToCart}
											canAddToCart={canAddToCart}
										/>
									</div>

									{/* Store Locations */}
									{productWithDetails?.storeLocations &&
										productWithDetails.storeLocations.length > 0 && (
											<div className="text-sm">
												<span className="text-foreground-muted">
													Доступно в магазинах:{" "}
												</span>
												<span className="text-foreground">
													{productWithDetails.storeLocations?.map(
														(location, index) => (
															<span key={location.id}>
																<Link href="/contact" className="text-accent">
																	{location.address}
																</Link>
																{index <
																	(productWithDetails.storeLocations?.length ??
																		0) -
																		1 && ", "}
															</span>
														),
													)}
												</span>
											</div>
										)}
								</div>

								{/* Important Note */}
								{productWithDetails?.importantNote && (
									<div className="prose max-w-none">
										<ReactMarkdown
											components={markdownComponents}
											rehypePlugins={rehypePlugins}
										>
											{formatContentForDisplay(
												productWithDetails?.importantNote ?? "",
											)}
										</ReactMarkdown>
									</div>
								)}
							</div>
						</div>

						{/* Description and Characteristics Section */}
						{(productWithDetails?.description ||
							productWithDetails?.hasVariations ||
							(productWithDetails?.productAttributes &&
								Array.isArray(productWithDetails.productAttributes) &&
								productWithDetails.productAttributes.length > 0)) && (
							<div className="w-full">
								<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
									{/* Left Column - Characteristics */}
									{(productWithDetails?.hasVariations ||
										(productWithDetails?.productAttributes &&
											Array.isArray(productWithDetails.productAttributes) &&
											productWithDetails.productAttributes.length > 0)) && (
										<div className="space-y-4">
											<h2>Характеристики</h2>
											<div>
												{/* Product-level attributes - only show standardized attributes */}
												{(productWithDetails?.productAttributes ?? [])
													.filter(
														(attr: { attributeId: string; value: string }) => {
															if (!attributes || !attributes.length)
																return false;
															const attribute = findAttributeByIdOrSlugOrName(
																attr.attributeId,
																attributes,
															);
															if (!attribute) return false;
															// Exclude Толщина (thickness) from characteristics - it should be in dimensions
															const attributeNameLower =
																attribute.name.toLowerCase();
															const attributeSlugLower =
																attribute.slug.toLowerCase();
															if (
																attributeNameLower.includes("толщина") ||
																attributeSlugLower.includes("thickness")
															) {
																return false;
															}
															return true;
														},
													)
													.map(
														(attr: { attributeId: string; value: string }) => {
															const attribute = findAttributeByIdOrSlugOrName(
																attr.attributeId,
																attributes,
															);
															const displayName = attribute
																? attribute.name
																: attr.attributeId;

															return (
																<div
																	key={attr.attributeId}
																	className="flex items-center justify-between py-2"
																>
																	<span className="text-foreground-muted">
																		{displayName}
																	</span>
																	<span>{attr.value}</span>
																</div>
															);
														},
													)}

												{/* Variation attributes */}
												{productWithDetails?.hasVariations &&
													(() => {
														// Use selectedVariation directly (already has all attributes)
														// Fallback to first variation if no selection
														const productWithVariations =
															productWithDetails as unknown as ProductListItem;
														const variationToShow:
															| ProductVariationWithAttributes
															| undefined =
															(selectedVariation as ProductVariationWithAttributes | null) ||
															productWithVariations.variations?.[0];

														if (!variationToShow?.attributes) return null;

														return variationToShow.attributes
															.filter((attr: VariationAttribute) => {
																const attribute = findAttributeByIdOrSlugOrName(
																	attr.attributeId,
																	attributes,
																);
																if (!attribute) return true; // Keep if not found in standardized list
																// Exclude Толщина (thickness) from characteristics - it should be in dimensions
																const attributeNameLower =
																	attribute.name.toLowerCase();
																const attributeSlugLower =
																	attribute.slug.toLowerCase();
																return !(
																	attributeNameLower.includes("толщина") ||
																	attributeSlugLower.includes("thickness")
																);
															})
															.map((attr: VariationAttribute) => {
																const attribute = findAttributeByIdOrSlugOrName(
																	attr.attributeId,
																	attributes,
																);
																const displayName = attribute
																	? attribute.name
																	: attr.attributeId;

																return (
																	<div
																		key={attr.attributeId}
																		className="flex items-center justify-between py-2"
																	>
																		<span className="font-normal text-foreground-muted">
																			{displayName}
																		</span>
																		<span className="font-normal text-foreground">
																			{attr.value}
																		</span>
																	</div>
																);
															});
													})()}
											</div>
										</div>
									)}

									{/* Dimensions */}
									{productWithDetails?.dimensions ? (
										<div className="space-y-4">
											<h3>Габариты</h3>
											<div>
												{productWithDetails.dimensions
													.split("\n")
													.filter((line) => line.trim())
													.map((line) => {
														const [label, ...valueParts] = line.split(":");
														const value = valueParts.join(":").trim();
														const trimmedLabel = label.trim();
														return (
															<div
																key={`${trimmedLabel}-${value}`}
																className="flex items-center justify-between py-2"
															>
																<span className="text-foreground-muted">
																	{trimmedLabel}
																</span>
																<span>{value}</span>
															</div>
														);
													})}
											</div>
										</div>
									) : isFetchingProduct ? (
										<div className="space-y-4">
											<h3>Габариты</h3>
											<DimensionsSkeleton />
										</div>
									) : null}

									{/* Right Column - Description */}
									{productWithDetails?.description ? (
										<div className="space-y-4">
											<h2>Описание</h2>
											<div className="prose max-w-none">
												<ReactMarkdown
													components={markdownComponents}
													rehypePlugins={rehypePlugins}
												>
													{productWithDetails?.description?.replace(
														/\\n/g,
														"\n",
													) ?? ""}
												</ReactMarkdown>
											</div>
										</div>
									) : isFetchingProduct ? (
										<div className="space-y-4">
											<h2>Описание</h2>
											<DescriptionSkeleton />
										</div>
									) : null}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Recently Visited Products Slider - wrapper is inside ProductSlider so nothing is rendered when there are no products to show */}
			{hasRecentlyVisited && recentlyVisitedProductIds.length > 0 && (
				<ProductSlider
					mode="recentlyVisited"
					title="Вы недавно смотрели"
					recentlyVisitedProductIds={recentlyVisitedProductIds}
				/>
			)}

			{/* Fixed Price and Add to Cart Bar - Mobile only (< 768px), positioned above bottom nav */}
			<div className="fixed right-0 bottom-[72px] left-0 z-9999 md:hidden">
				<MobileFixedCartBar
					currentDiscount={currentDiscount}
					originalTotalPrice={originalTotalPrice}
					totalPrice={totalPrice}
					quantity={quantity}
					isFlooringProduct={isFlooringProduct}
					getUnitShortLabel={getUnitShortLabel}
					handleAddToCart={handleAddToCart}
					canAddToCart={canAddToCart}
					productWithDetails={productWithDetails}
				/>
			</div>
		</div>
	);
}
