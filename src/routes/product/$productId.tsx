import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
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
import { productQueryOptions, userDataQueryOptions } from "~/lib/queryOptions";
import type {
	ProductAttribute,
	ProductVariationWithAttributes,
	ProductWithDetails,
	ProductWithVariations,
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
): ProductWithVariations | null => {
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
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center max-w-md">
				<h1 className="text-4xl font-bold mb-4">Oops!</h1>
				<p className="text-muted-foreground mb-6">
					Something went wrong while loading this product.
				</p>
				<div className="flex gap-3 justify-center">
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
						<summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
							Error details
						</summary>
						<pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto">
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
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center max-w-md">
				<h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
				<p className="text-muted-foreground mb-6">
					The product you're looking for doesn't exist or has been removed.
				</p>
				<div className="flex gap-3 justify-center">
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
		const product = await queryClient.ensureQueryData(
			productQueryOptions(params.productId, cachedProduct),
		);
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

function ProductPage() {
	const { productId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [quantity, setQuantity] = useState(1);

	const { addToCart } = useCart();
	const { data: attributes } = useProductAttributes();
	const queryClient = useQueryClient();
	const cachedProduct = useMemo(
		() => getCachedProductForDetails(queryClient, productId),
		[queryClient, productId],
	);

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

	// Use suspense query - data is guaranteed to be available by the loader
	// No need for manual cache access or fallback logic!
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
		product: productWithDetails as unknown as ProductWithVariations | null,
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
					<div className="w-full relative z-0">
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
						className="absolute top-0 right-0 w-full h-full pointer-events-none"
						style={{
							zIndex: 9999,
							viewTransitionName: "product-info-container",
						}}
					>
						<div className="sticky top-16 w-full lg:w-2/5 min-w-0 h-fit ml-auto pointer-events-auto">
							<div className="flex items-start justify-end p-8 min-w-0">
								<div className="product-info-overlay p-6 max-w-[45vw] rounded-lg shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] min-w-0 w-fit border border-border relative">
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
										<div>
											<Breadcrumb>
												<BreadcrumbList>
													<BreadcrumbItem>
														<BreadcrumbLink asChild>
															<Link
																href="/"
																className="text-gray-400 hover:text-gray-600"
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
																className="text-gray-400 hover:text-gray-600"
															>
																Ламинат
															</Link>
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem>
														<BreadcrumbPage className="text-gray-400">
															{productWithDetails?.name}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</BreadcrumbList>
											</Breadcrumb>
										</div>

										{/* Product Title */}
										<div>
											<h1 className="">
												{productWithDetails?.name || "Product"}
											</h1>
											<div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
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
										<div className="border border-border rounded-lg p-2 space-y-4 min-w-0 max-w-full @container">
											{/* Price and Quantity */}
											<div className="flex flex-wrap items-stretch gap-0 min-w-0 w-full">
												{/* Price Box */}
												<div className="bg-muted px-4 py-3 rounded-lg flex flex-col justify-center items-center @[38ch]:items-start w-full @[38ch]:w-auto text-center @[38ch]:text-left">
													<div className="text-sm text-gray-500 mb-1">
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
														<div className="text-sm line-through text-muted-foreground mb-1">
															{Math.round(currentPrice).toLocaleString()} р
														</div>
													)}
													<div className="text-2xl font-bold text-foreground leading-tight!">
														{Math.round(displayPrice).toLocaleString()} р
													</div>
												</div>

												{/* Icon divider - horizontal (shown when both blocks fit in one row) */}
												<div className="hidden @[38ch]:flex shrink-0 px-1 items-center justify-center">
													<Icon
														name="plus"
														size={28}
														className="text-foreground-muted rotate-45"
													/>
												</div>

												{/* Icon divider - vertical (shown when stacked) */}
												<div className="@[38ch]:hidden w-full flex justify-center py-2">
													<Icon
														name="plus"
														size={28}
														className="text-foreground-muted rotate-45"
													/>
												</div>

												{/* Quantity Selector */}
												<div className="flex flex-col min-w-[20ch] flex-1 self-stretch w-full @[38ch]:w-auto">
													<div className="flex gap-0.5 items-stretch w-full flex-1">
														<Button
															type="button"
															onClick={decrementQuantity}
															disabled={quantity <= 1}
															className="flex-1 min-w-10 h-full self-stretch flex items-center justify-center text-primary bg-muted hover:bg-secondary hover:[&_svg]:text-[var(--muted)] active:bg-muted-hover rounded-[15px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
														>
															<Icon name="minus" size={20} />
														</Button>
														<div className="text-center bg-muted rounded-lg py-1 px-0.5 flex items-center justify-center flex-1">
															<div className="flex flex-col items-center gap-1 w-full justify-center">
																{productWithDetails?.squareMetersPerPack && (
																	<div className="flex flex-col items-center justify-center w-full gap-0">
																		<div className="text-lg sm:text-xl font-normal whitespace-nowrap text-foreground">
																			{(
																				quantity *
																				productWithDetails.squareMetersPerPack
																			).toFixed(2)}{" "}
																			м²
																		</div>
																		<div className="text-xs sm:text-sm font-normal whitespace-nowrap text-muted-foreground -mt-1">
																			Площадь
																		</div>
																	</div>
																)}
																<div className="flex flex-col items-center justify-center w-full gap-0 pb-0.5">
																	<Input
																		type="number"
																		min={1}
																		value={quantity}
																		onChange={handleQuantityChange}
																		className="text-lg sm:text-xl font-normal text-center border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 m-0 h-auto w-auto min-w-[4ch] max-w-[8ch] field-sizing-content [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																	/>
																	{isFlooringProduct && (
																		<div className="text-xs sm:text-sm font-normal whitespace-nowrap text-muted-foreground -mt-3.5">
																			Упаковок
																		</div>
																	)}
																</div>
															</div>
														</div>
														<Button
															type="button"
															onClick={incrementQuantity}
															className="flex-1 min-w-10 h-full self-stretch flex items-center justify-center text-primary bg-muted hover:bg-secondary hover:[&_svg]:text-[var(--muted)] active:bg-muted-hover rounded-[15px] cursor-pointer"
														>
															<Icon name="plus" size={20} />
														</Button>
													</div>
												</div>
											</div>

											{/* Variation Selector */}
											{productWithDetails?.hasVariations && (
												<VariationSelector
													product={
														productWithDetails as unknown as ProductWithVariations
													}
													selectedAttributes={selectedAttributes}
													search={search}
													onAttributeChange={handleAttributeChange}
												/>
											)}

											{/* Price and Add to Cart */}
											{currentDiscount && currentDiscount > 0 ? (
												/* With discount: Grid layout with button spanning both rows */
												<div className="bg-muted rounded-lg p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-stretch">
													{/* Discount Row */}
													<div className="flex items-baseline gap-4">
														<div className="text-left">Скидка</div>
														<span className="text-lg line-through whitespace-nowrap">
															{Math.round(originalTotalPrice).toLocaleString()}{" "}
															р
														</span>
														<span className="px-2 py-1 bg-accent text-accent-foreground! text-sm font-semibold rounded-[5px] whitespace-nowrap">
															-{currentDiscount}%
														</span>
													</div>

													{/* Add to Cart Button - spans both rows */}
													<div className="row-span-2 flex">
														<Button
															onClick={handleAddToCart}
															disabled={!canAddToCart}
															size="lg"
															className="w-full h-full"
														>
															{!canAddToCart ? "Недоступно" : "В корзину"}
														</Button>
													</div>

													{/* Total Row */}
													<div className="flex items-baseline gap-4">
														<div className="text-left">Итого</div>
														<span className="text-3xl font-bold whitespace-nowrap">
															{Math.round(totalPrice).toLocaleString()} р
														</span>
													</div>
												</div>
											) : (
												/* Without discount: Label above price */
												<div className="bg-muted rounded-lg p-2 flex flex-row gap-4 items-stretch">
													{/* Price Display - stacked vertically */}
													<div className="flex flex-col">
														<div className="text-sm text-muted-foreground">
															Итого
														</div>
														<h5 className="">
															{Math.round(totalPrice).toLocaleString()} р
														</h5>
													</div>

													{/* Add to Cart Button */}
													<div className="flex-1 flex">
														<Button
															onClick={handleAddToCart}
															disabled={!canAddToCart}
															size="lg"
															className="w-full h-full"
														>
															{!canAddToCart ? "Недоступно" : "В корзину"}
														</Button>
													</div>
												</div>
											)}

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
							</div>
						</div>
					</div>

					{/* Description and Characteristics Section */}
					{(productWithDetails?.description ||
						productWithDetails?.hasVariations ||
						(productWithDetails?.productAttributes &&
							Array.isArray(productWithDetails.productAttributes) &&
							productWithDetails.productAttributes.length > 0)) && (
						<div className="max-w-7xl mx-auto px-4 py-8 lg:pr-[45%]">
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
															className="flex justify-between items-center py-2"
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
														productWithDetails as unknown as ProductWithVariations;
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
																	className="flex justify-between items-center py-2"
																>
																	<span className="text-foreground-muted font-normal">
																		{displayName}
																	</span>
																	<span className="text-foreground font-normal">
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
															className="flex justify-between items-center py-2"
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
				<div className="max-w-7xl mx-auto px-4 py-8 pb-8">
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
														className="text-gray-400 hover:text-gray-600"
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
														className="text-gray-400 hover:text-gray-600"
													>
														Ламинат
													</Link>
												</BreadcrumbLink>
											</BreadcrumbItem>
											<BreadcrumbSeparator />
											<BreadcrumbItem>
												<BreadcrumbPage className="text-gray-400">
													{productWithDetails?.name}
												</BreadcrumbPage>
											</BreadcrumbItem>
										</BreadcrumbList>
									</Breadcrumb>
								</div>

								{/* Product Title */}
								<div>
									<h1 className="">{productWithDetails?.name || "Product"}</h1>
									<div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
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
								<div className="border border-border rounded-lg p-2 space-y-4 min-w-0">
									{/* Price and Quantity */}
									<div className="@container">
										<div className="flex flex-wrap items-stretch gap-0 min-w-0 w-full">
											{/* Price Box */}
											<div className="bg-muted px-4 py-3 rounded-lg flex flex-col justify-center items-center @[38ch]:items-start w-full @[38ch]:w-auto text-center @[38ch]:text-left">
												<div className="text-sm text-gray-500 mb-1">
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
													<div className="text-sm line-through text-muted-foreground mb-1">
														{Math.round(currentPrice).toLocaleString()} р
													</div>
												)}
												<div className="text-2xl font-bold text-gray-800">
													{Math.round(displayPrice).toLocaleString()} р
												</div>
											</div>

											{/* Icon divider - horizontal (shown when both blocks fit in one row) */}
											<div className="hidden @[38ch]:flex shrink-0 px-1 items-center justify-center">
												<Icon
													name="plus"
													size={28}
													className="text-foreground-muted rotate-45"
												/>
											</div>

											{/* Icon divider - vertical (shown when stacked) */}
											<div className="@[38ch]:hidden w-full flex justify-center py-2">
												<Icon
													name="plus"
													size={28}
													className="text-foreground-muted rotate-45"
												/>
											</div>

											{/* Quantity Selector */}
											<div className="flex flex-col min-w-[20ch] flex-1 self-stretch w-full @[38ch]:w-auto">
												<div className="flex gap-0.5 items-stretch w-full flex-1">
													<Button
														type="button"
														onClick={decrementQuantity}
														disabled={quantity <= 1}
														className="flex-1 min-w-10 h-full self-stretch flex items-center justify-center text-primary bg-muted hover:bg-secondary hover:[&_svg]:text-[var(--muted)] active:bg-muted-hover rounded-[15px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
													>
														<Icon name="minus" size={20} />
													</Button>
													<div className="text-center bg-muted rounded-lg py-1 px-0.5 flex items-center justify-center flex-1">
														<div className="flex flex-col items-center gap-1 w-full justify-center">
															{productWithDetails?.squareMetersPerPack && (
																<div className="flex flex-col items-center justify-center w-full gap-0">
																	<div className="text-lg sm:text-xl font-normal whitespace-nowrap text-foreground">
																		{(
																			quantity *
																			productWithDetails.squareMetersPerPack
																		).toFixed(2)}{" "}
																		м²
																	</div>
																	<div className="text-xs sm:text-sm font-normal whitespace-nowrap text-muted-foreground -mt-1">
																		Площадь
																	</div>
																</div>
															)}
															<div className="flex flex-col items-center justify-center w-full gap-0 pb-0.5">
																<Input
																	type="number"
																	min={1}
																	value={quantity}
																	onChange={handleQuantityChange}
																	className="text-lg sm:text-xl font-normal text-center border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 m-0 h-auto w-auto min-w-[4ch] max-w-[8ch] field-sizing-content [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																/>
																{isFlooringProduct && (
																	<div className="text-xs sm:text-sm font-normal whitespace-nowrap text-muted-foreground -mt-3.5">
																		Упаковок
																	</div>
																)}
															</div>
														</div>
													</div>
													<Button
														type="button"
														onClick={incrementQuantity}
														className="flex-1 min-w-10 h-full self-stretch flex items-center justify-center text-primary bg-muted hover:bg-secondary hover:[&_svg]:text-[var(--muted)] active:bg-muted-hover rounded-[15px] cursor-pointer"
													>
														<Icon name="plus" size={20} />
													</Button>
												</div>
											</div>
										</div>
									</div>

									{/* Variation Selector */}
									{productWithDetails?.hasVariations && (
										<VariationSelector
											product={
												productWithDetails as unknown as ProductWithVariations
											}
											selectedAttributes={selectedAttributes}
											search={search}
											onAttributeChange={handleAttributeChange}
										/>
									)}

									{/* Price and Add to Cart - Hidden on mobile (shown in fixed bar), visible on tablet */}
									<div className="hidden md:block">
										{currentDiscount && currentDiscount > 0 ? (
											/* With discount: Grid layout with button spanning both rows */
											<div className="bg-muted rounded-lg p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-stretch">
												{/* Discount Row */}
												<div className="flex items-baseline gap-4">
													<div className="text-left">Скидка</div>
													<span className="text-lg line-through whitespace-nowrap">
														{Math.round(originalTotalPrice).toLocaleString()} р
													</span>
													<span className="px-2 py-1 bg-accent text-accent-foreground! text-sm font-semibold rounded-[5px] whitespace-nowrap">
														-{currentDiscount}%
													</span>
												</div>

												{/* Add to Cart Button - spans both rows */}
												<div className="row-span-2 flex">
													<Button
														onClick={handleAddToCart}
														disabled={!canAddToCart}
														size="sm"
														className="w-full h-full"
													>
														{!canAddToCart ? "Недоступно" : "В корзину"}
													</Button>
												</div>

												{/* Total Row */}
												<div className="flex items-baseline gap-4">
													<div className="text-left">Итого</div>
													<span className="text-xl font-bold whitespace-nowrap">
														{Math.round(totalPrice).toLocaleString()} р
													</span>
												</div>
											</div>
										) : (
											/* Without discount: Label above price */
											<div className="bg-muted rounded-lg p-2 flex flex-row gap-4 items-stretch">
												{/* Price Display - stacked vertically */}
												<div className="flex flex-col">
													<div className="text-sm text-muted-foreground">
														Итого
													</div>
													<span className="text-xl font-bold">
														{Math.round(totalPrice).toLocaleString()} р
													</span>
												</div>

												{/* Add to Cart Button */}
												<div className="flex-1 flex">
													<Button
														onClick={handleAddToCart}
														disabled={!canAddToCart}
														size="sm"
														className="w-full h-full"
													>
														{!canAddToCart ? "Недоступно" : "В корзину"}
													</Button>
												</div>
											</div>
										)}
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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
																	className="flex justify-between items-center py-2"
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
															productWithDetails as unknown as ProductWithVariations;
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
																		className="flex justify-between items-center py-2"
																	>
																		<span className="text-foreground-muted font-normal">
																			{displayName}
																		</span>
																		<span className="text-foreground font-normal">
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
																className="flex justify-between items-center py-2"
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
			<div className="md:hidden fixed bottom-[72px] left-0 right-0 z-9999">
				{currentDiscount && currentDiscount > 0 ? (
					/* With discount: Grid layout with button spanning both rows */
					<div className="bg-muted grid grid-cols-[auto_1fr] grid-rows-2 items-stretch shadow-lg border-t border-border">
						{/* Left column - Price info with padding, spans both rows, content-sized */}
						<div className="row-span-2 px-2 py-2 flex flex-col justify-center space-y-1 min-w-0">
							{/* Discount Row - adapts to price width */}
							<div className="flex items-baseline gap-2 flex-wrap">
								<div className="text-left whitespace-nowrap">Скидка</div>
								<span className="text-sm line-through whitespace-nowrap">
									{Math.round(originalTotalPrice).toLocaleString()} р
								</span>
								<span className="px-2 py-1 bg-accent text-accent-foreground! text-xs font-semibold rounded-[5px] whitespace-nowrap">
									-{currentDiscount}%
								</span>
							</div>

							{/* Total Row - with quantity on the right, price determines width */}
							<div className="flex items-baseline justify-between gap-2 min-w-0">
								<div className="flex items-baseline gap-2 min-w-0">
									<div className="text-left whitespace-nowrap">Итого</div>
									<span className="text-xl font-bold whitespace-nowrap">
										{Math.round(totalPrice).toLocaleString()} р
									</span>
								</div>
								<div className="flex items-baseline gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
									<span>{quantity}</span>
									<span>
										{isFlooringProduct
											? "упак"
											: getUnitShortLabel(
													productWithDetails?.unitOfMeasurement,
												)}
									</span>
								</div>
							</div>
						</div>

						{/* Add to Cart Button - spans both rows, flush with edges */}
						<div className="row-span-2 flex">
							<Button
								onClick={handleAddToCart}
								disabled={!canAddToCart}
								size="sm"
								className="w-full h-full rounded-none"
							>
								{!canAddToCart ? "Недоступно" : "В корзину"}
							</Button>
						</div>
					</div>
				) : (
					/* Without discount: Label above price */
					<div className="bg-muted flex flex-row items-stretch shadow-lg border-t border-border">
						{/* Price Display - stacked vertically with padding, content-sized */}
						<div className="flex flex-col px-2 py-2 min-w-0">
							<div className="flex items-baseline justify-between gap-2">
								<div className="text-sm text-muted-foreground whitespace-nowrap">
									Итого
								</div>
								<div className="flex items-baseline gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
									<span>{quantity}</span>
									<span>
										{isFlooringProduct
											? "упак"
											: getUnitShortLabel(
													productWithDetails?.unitOfMeasurement,
												)}
									</span>
								</div>
							</div>
							<div className="flex items-baseline">
								<span className="text-xl font-bold whitespace-nowrap">
									{Math.round(totalPrice).toLocaleString()} р
								</span>
							</div>
						</div>

						{/* Add to Cart Button - flush with edges */}
						<div className="flex-1 flex">
							<Button
								onClick={handleAddToCart}
								disabled={!canAddToCart}
								size="sm"
								className="w-full h-full rounded-none"
							>
								{!canAddToCart ? "Недоступно" : "В корзину"}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
