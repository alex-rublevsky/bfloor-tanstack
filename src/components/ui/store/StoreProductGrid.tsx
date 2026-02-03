/**
 * Shared store product grid component
 * Used by both /store and /store/$categorySlug routes
 * Handles all filter state, queries, virtualizer, and product rendering
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useElementScrollRestoration } from "@tanstack/react-router";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "~/components/ui/shared/EmptyState";
import { ProductGridSkeleton } from "~/components/ui/shared/ProductGridSkeleton";
import ProductCard from "~/components/ui/store/ProductCard";
import ProductFilters from "~/components/ui/store/ProductFilters";
import { getAllStoreLocations } from "~/data/storeLocations";
import { useDeviceType } from "~/hooks/use-mobile";
import { useClientSearch } from "~/lib/clientSearchContext";
import {
	attributeValuesForFilteringQueryOptions,
	filteredBrandsQueryOptions,
	filteredCollectionsQueryOptions,
	storeDataInfiniteQueryOptions,
} from "~/lib/queryOptions";
import type { Brand, Collection, ProductWithVariations } from "~/types";
import {
	defaultStoreSearchValues,
	isValidSort,
	parseAttributeFilters,
	useResponsiveColumns,
} from "~/utils/storePageUtils";

// Cache for virtualizer measurements - persists across navigations
const measurementCache = new Map<string, number>();
// Per-cacheKey running sum/count for unmeasured row estimate (reduces scroll jitter)
const measurementStats = new Map<string, { sum: number; count: number }>();

const itemHeight = 365;

function getEstimatedRowHeight(cacheKey: string, index: number): number {
	const cached = measurementCache.get(`${cacheKey}-${index}`);
	if (cached !== undefined) return cached;
	const stats = measurementStats.get(cacheKey);
	if (stats && stats.count > 0) return stats.sum / stats.count;
	return itemHeight;
}

function setRowMeasurement(
	cacheKey: string,
	index: number,
	height: number,
): void {
	const key = `${cacheKey}-${index}`;
	const oldHeight = measurementCache.get(key);
	measurementCache.set(key, height);
	let stats = measurementStats.get(cacheKey);
	if (!stats) {
		stats = { sum: 0, count: 0 };
		measurementStats.set(cacheKey, stats);
	}
	if (oldHeight !== undefined) stats.sum -= oldHeight;
	stats.sum += height;
	if (oldHeight === undefined) stats.count += 1;
}

function measureRowHeight(
	element: Element,
	entry: ResizeObserverEntry | undefined,
	cacheKey: string,
): number {
	const indexStr = element.getAttribute("data-index");
	if (indexStr === null) return itemHeight;
	const index = Number.parseInt(indexStr, 10);
	const raw =
		entry?.borderBoxSize?.[0]?.blockSize ??
		(element as HTMLElement).getBoundingClientRect?.()?.height ??
		itemHeight;
	const height = Math.round(raw);
	setRowMeasurement(cacheKey, index, height);
	return height;
}

// Virtualized list for window scroll (mobile)
const VirtualizedProductListWindow = memo(
	({
		displayProducts,
		columnsPerRow,
		scrollEntry,
		cacheKey,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	}: {
		displayProducts: ProductWithVariations[];
		columnsPerRow: number;
		scrollEntry: { scrollY?: number } | null | undefined;
		cacheKey: string;
		fetchNextPage: () => void;
		hasNextPage: boolean;
		isFetchingNextPage: boolean;
	}) => {
		const rowCount = Math.ceil(displayProducts.length / columnsPerRow);
		const lastCheckRef = useRef<{ cacheKey: string; index: number }>({
			cacheKey,
			index: 0,
		});
		if (lastCheckRef.current.cacheKey !== cacheKey) {
			lastCheckRef.current = { cacheKey, index: 0 };
		}

		const virtualizer = useWindowVirtualizer({
			count: rowCount,
			estimateSize: useCallback(
				(index: number) => getEstimatedRowHeight(cacheKey, index),
				[cacheKey],
			),
			overscan: 12,
			initialOffset: scrollEntry?.scrollY,
			measureElement: useCallback(
				(element: Element, entry: ResizeObserverEntry | undefined) =>
					measureRowHeight(element, entry, cacheKey),
				[cacheKey],
			),
		});

		// Re-measure rows when the number of columns changes
		// biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally re-measure when columns change
		useEffect(() => {
			// Measure immediately - virtualizer's ResizeObserver handles optimization
			virtualizer.measure();
		}, [columnsPerRow, virtualizer]);

		// Helper function to get products for a specific row
		const getProductsForRow = useCallback(
			(rowIndex: number) => {
				const startIndex = rowIndex * columnsPerRow;
				const endIndex = Math.min(
					startIndex + columnsPerRow,
					displayProducts.length,
				);
				return displayProducts.slice(startIndex, endIndex);
			},
			[columnsPerRow, displayProducts],
		);

		// Infinite scroll - load more products when user scrolls near the end
		const virtualItems = virtualizer.getVirtualItems();

		useEffect(() => {
			const lastItem = virtualItems[virtualItems.length - 1];

			if (!lastItem || !hasNextPage || isFetchingNextPage) return;

			// Fetch when within 4 rows of the end
			const threshold = rowCount - 4;

			// Fetch if we're past the threshold and haven't fetched for this threshold yet
			if (
				lastItem.index >= threshold &&
				lastCheckRef.current.index < threshold
			) {
				lastCheckRef.current.index = threshold;
				fetchNextPage();
			}
		}, [
			virtualItems,
			hasNextPage,
			isFetchingNextPage,
			rowCount,
			fetchNextPage,
		]);

		return (
			<div
				className="relative py-4"
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
					animation: "fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				{virtualizer.getVirtualItems().map((virtualRow) => {
					const rowProducts = getProductsForRow(virtualRow.index);
					return (
						<div
							key={virtualRow.key}
							data-index={virtualRow.index}
							ref={virtualizer.measureElement}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: `translateY(${virtualRow.start}px)`,
							}}
						>
							{/* items-stretch: equal-height cards per row; pb-3: room for hover shadow so it doesn't overlap next row */}
							<div className="grid grid-cols-2 items-stretch gap-2 pb-3 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
								{rowProducts.map((product) => (
									<ProductCard key={product.id} product={product} />
								))}
							</div>
						</div>
					);
				})}
			</div>
		);
	},
);
VirtualizedProductListWindow.displayName = "VirtualizedProductListWindow";

// Virtualized list for custom scroll container (desktop sidebar layout)
const VirtualizedProductListContainer = memo(
	({
		displayProducts,
		columnsPerRow,
		cacheKey,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		scrollRef,
	}: {
		displayProducts: ProductWithVariations[];
		columnsPerRow: number;
		cacheKey: string;
		fetchNextPage: () => void;
		hasNextPage: boolean;
		isFetchingNextPage: boolean;
		scrollRef: RefObject<HTMLDivElement | null>;
	}) => {
		const rowCount = Math.ceil(displayProducts.length / columnsPerRow);
		const lastCheckRef = useRef<{ cacheKey: string; index: number }>({
			cacheKey,
			index: 0,
		});
		if (lastCheckRef.current.cacheKey !== cacheKey) {
			lastCheckRef.current = { cacheKey, index: 0 };
		}

		const virtualizer = useVirtualizer({
			count: rowCount,
			getScrollElement: useCallback(() => scrollRef.current, [scrollRef]),
			estimateSize: useCallback(
				(index: number) => getEstimatedRowHeight(cacheKey, index),
				[cacheKey],
			),
			overscan: 12,
			measureElement: useCallback(
				(element: Element, entry: ResizeObserverEntry | undefined) =>
					measureRowHeight(element, entry, cacheKey),
				[cacheKey],
			),
		});

		// biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally re-measure when columns change
		useEffect(() => {
			virtualizer.measure();
		}, [columnsPerRow, virtualizer]);

		const getProductsForRow = useCallback(
			(rowIndex: number) => {
				const startIndex = rowIndex * columnsPerRow;
				const endIndex = Math.min(
					startIndex + columnsPerRow,
					displayProducts.length,
				);
				return displayProducts.slice(startIndex, endIndex);
			},
			[columnsPerRow, displayProducts],
		);

		const virtualItems = virtualizer.getVirtualItems();
		useEffect(() => {
			const lastItem = virtualItems[virtualItems.length - 1];
			if (!lastItem || !hasNextPage || isFetchingNextPage) return;
			const threshold = rowCount - 4;
			if (
				lastItem.index >= threshold &&
				lastCheckRef.current.index < threshold
			) {
				lastCheckRef.current.index = threshold;
				fetchNextPage();
			}
		}, [
			virtualItems,
			hasNextPage,
			isFetchingNextPage,
			rowCount,
			fetchNextPage,
		]);

		return (
			<div
				className="relative py-4"
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
					animation: "fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				{virtualizer.getVirtualItems().map((virtualRow) => {
					const rowProducts = getProductsForRow(virtualRow.index);
					return (
						<div
							key={virtualRow.key}
							data-index={virtualRow.index}
							ref={virtualizer.measureElement}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: `translateY(${virtualRow.start}px)`,
							}}
						>
							{/* items-stretch: equal-height cards per row; pb-3: room for hover shadow so it doesn't overlap next row */}
							<div className="grid grid-cols-2 items-stretch gap-2 pb-3 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
								{rowProducts.map((product) => (
									<ProductCard key={product.id} product={product} />
								))}
							</div>
						</div>
					);
				})}
			</div>
		);
	},
);
VirtualizedProductListContainer.displayName = "VirtualizedProductListContainer";

// Chooses window or container virtualizer based on scrollRef
function VirtualizedProductList(props: {
	displayProducts: ProductWithVariations[];
	columnsPerRow: number;
	scrollEntry: { scrollY?: number } | null | undefined;
	cacheKey: string;
	fetchNextPage: () => void;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	scrollRef?: RefObject<HTMLDivElement | null>;
}) {
	if (props.scrollRef) {
		return (
			<VirtualizedProductListContainer
				displayProducts={props.displayProducts}
				columnsPerRow={props.columnsPerRow}
				cacheKey={props.cacheKey}
				fetchNextPage={props.fetchNextPage}
				hasNextPage={props.hasNextPage}
				isFetchingNextPage={props.isFetchingNextPage}
				scrollRef={props.scrollRef}
			/>
		);
	}
	return (
		<VirtualizedProductListWindow
			displayProducts={props.displayProducts}
			columnsPerRow={props.columnsPerRow}
			scrollEntry={props.scrollEntry}
			cacheKey={props.cacheKey}
			fetchNextPage={props.fetchNextPage}
			hasNextPage={props.hasNextPage}
			isFetchingNextPage={props.isFetchingNextPage}
		/>
	);
}

interface StoreProductGridProps {
	/**
	 * Category slug from route params (undefined for main store page or brand page)
	 */
	categorySlug?: string;
	/**
	 * Category name for display (null for main store page or brand page)
	 */
	categoryName?: string | null;
	/**
	 * Brand slug from route when this is a brand page (undefined for category or main store)
	 */
	brandSlug?: string;
	/**
	 * Brand for display when it's a brand page ({ slug, name })
	 */
	brand?: { slug: string; name: string };
	/**
	 * Search params from route
	 */
	searchParams: {
		brand?: string;
		collection?: string;
		storeLocation?: number;
		attributeFilters?: string;
		sort?:
			| "name"
			| "price-asc"
			| "price-desc"
			| "newest"
			| "oldest"
			| "best-selling";
	};
	/**
	 * Navigate function from route (supports search updates and to for navigation)
	 */
	navigate: (options: {
		search?: (prev: Record<string, unknown>) => Record<string, unknown>;
		to?: string;
		replace?: boolean;
	}) => void;
}

export const StoreProductGrid = memo(function StoreProductGrid({
	categorySlug,
	categoryName = null,
	brandSlug,
	brand,
	searchParams,
	navigate,
}: StoreProductGridProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const productScrollRef = useRef<HTMLDivElement>(null);
	const columnsPerRow = useResponsiveColumns();
	const { isMobileOrTablet } = useDeviceType();
	const isDesktop = !isMobileOrTablet;

	// Get search term from context (same as dashboard)
	const clientSearch = useClientSearch();
	const normalizedSearch = useMemo(() => {
		const value =
			typeof clientSearch.searchTerm === "string"
				? clientSearch.searchTerm
				: "";
		const trimmed = value.trim().replace(/\s+/g, " ");
		return trimmed.length >= 2 ? trimmed : undefined;
	}, [clientSearch.searchTerm]);

	// Initialize filter state: route brand (brand page) takes precedence over search param
	const [selectedBrand, setSelectedBrand] = useState<string | null>(
		brandSlug ?? searchParams.brand ?? null,
	);
	const [selectedCollection, setSelectedCollection] = useState<string | null>(
		searchParams.collection ?? null,
	);
	const [selectedStoreLocation, setSelectedStoreLocation] = useState<
		number | null
	>(searchParams.storeLocation ?? null);
	const [selectedAttributeFilters, setSelectedAttributeFilters] = useState<
		Record<number, string[]>
	>(parseAttributeFilters(searchParams.attributeFilters));
	const [sortBy, setSortBy] = useState<
		"name" | "price-asc" | "price-desc" | "newest" | "oldest" | "best-selling"
	>(searchParams.sort ?? defaultStoreSearchValues.sort);
	const DEFAULT_PRICE: [number, number] = [0, 1000000];
	const [currentPriceRange, setCurrentPriceRange] =
		useState<[number, number]>(DEFAULT_PRICE);
	// Track if filter drawer has been opened (for lazy loading attribute filters)
	const [filtersOpened, setFiltersOpened] = useState(false);

	// Sync state with URL when search params change (e.g., from browser back/forward); brand page keeps route brand
	useEffect(() => {
		setSelectedBrand(brandSlug ?? searchParams.brand ?? null);
		setSelectedCollection(searchParams.collection ?? null);
		setSelectedStoreLocation(searchParams.storeLocation ?? null);
		setSelectedAttributeFilters(
			parseAttributeFilters(searchParams.attributeFilters),
		);
		setSortBy(searchParams.sort ?? defaultStoreSearchValues.sort);
	}, [
		brandSlug,
		searchParams.brand,
		searchParams.collection,
		searchParams.storeLocation,
		searchParams.attributeFilters,
		searchParams.sort,
	]);

	// Update URL when filters change - using functional form as recommended by TanStack Router
	const updateBrand = (brand: string | null) => {
		setSelectedBrand(brand);
		navigate({
			search: (prev) => ({
				...prev,
				brand: brand ?? undefined,
			}),
			replace: true,
		});
	};

	const updateCollection = (collection: string | null) => {
		setSelectedCollection(collection);
		navigate({
			search: (prev) => ({
				...prev,
				collection: collection ?? undefined,
			}),
			replace: true,
		});
	};

	const updateStoreLocation = (locationId: number | null) => {
		setSelectedStoreLocation(locationId);
		navigate({
			search: (prev) => ({
				...prev,
				storeLocation: locationId ?? undefined,
			}),
			replace: true,
		});
	};

	const updateSort = (sort: typeof sortBy) => {
		setSortBy(sort);
		navigate({
			search: (prev) => ({
				...prev,
				sort: sort !== defaultStoreSearchValues.sort ? sort : undefined,
			}),
			replace: true,
		});
	};

	const updateAttributeFilter = (attributeId: number, valueIds: string[]) => {
		const newFilters = { ...selectedAttributeFilters };
		if (valueIds.length === 0) {
			delete newFilters[attributeId];
		} else {
			newFilters[attributeId] = valueIds;
		}
		setSelectedAttributeFilters(newFilters);

		// Update URL using functional form
		const filtersStr =
			Object.keys(newFilters).length > 0
				? JSON.stringify(newFilters)
				: undefined;
		navigate({
			search: (prev) => ({
				...prev,
				attributeFilters: filtersStr,
			}),
			replace: true,
		});
	};

	// Fetch attribute filters: on desktop always (sidebar visible); on mobile when drawer opened
	const filtersVisible = filtersOpened || isDesktop;
	const { data: attributeFilters = [] } = useQuery({
		...attributeValuesForFilteringQueryOptions(
			categorySlug ?? undefined,
			selectedBrand ?? undefined,
			selectedCollection ?? undefined,
			selectedAttributeFilters,
		),
		enabled: filtersVisible,
	});

	const { data: brands = [] } = useQuery({
		...filteredBrandsQueryOptions(
			categorySlug ?? undefined,
			selectedCollection ?? undefined,
			selectedStoreLocation ?? undefined,
		),
		enabled: filtersVisible && !brandSlug,
	});

	const { data: collections = [] } = useQuery({
		...filteredCollectionsQueryOptions(
			categorySlug ?? undefined,
			selectedBrand ?? undefined,
			selectedStoreLocation ?? undefined,
		),
		enabled: filtersVisible,
	});

	// Price range for filter UI: starts as default, updated from first page's priceBounds (same request, no extra API call)
	const [priceRange, setPriceRange] = useState({
		min: DEFAULT_PRICE[0],
		max: DEFAULT_PRICE[1],
	});

	// Use infinite query; first page response includes priceBounds (one aggregation when page=1, no extra HTTP round-trip)
	const {
		data: storeData,
		isFetching,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		...storeDataInfiniteQueryOptions(normalizedSearch, {
			categorySlug: categorySlug ?? undefined,
			brandSlug: brandSlug ?? selectedBrand ?? undefined,
			collectionSlug: selectedCollection ?? undefined,
			storeLocationId: selectedStoreLocation ?? undefined,
			attributeFilters: selectedAttributeFilters,
			minPrice:
				currentPriceRange[0] !== priceRange.min
					? currentPriceRange[0]
					: undefined,
			maxPrice:
				currentPriceRange[1] !== priceRange.max
					? currentPriceRange[1]
					: undefined,
			sort: sortBy,
		}),
		// Keep previous data during filter change so CSS can crossfade feed → skeleton
		placeholderData: (previousData) => previousData,
	});

	// Sync price range from first page bounds (real min/max for current filter set)
	const firstPageBounds = storeData?.pages?.[0]?.priceBounds;
	useEffect(() => {
		if (firstPageBounds && firstPageBounds.max >= firstPageBounds.min) {
			setPriceRange({ min: firstPageBounds.min, max: firstPageBounds.max });
		}
	}, [firstPageBounds]);

	// Reset price filter to full range only when category (page) changes or when bounds change (new data loaded).
	// Other filters (brand, collection, etc.) do not reset the price.
	// biome-ignore lint/correctness/useExhaustiveDependencies: categorySlug triggers reset on category navigation only
	useEffect(() => {
		setCurrentPriceRange([priceRange.min, priceRange.max]);
	}, [categorySlug, priceRange.min, priceRange.max]);

	// Get store locations (hardcoded data)
	const storeLocations = getAllStoreLocations();

	const brandsForFilters = useMemo(
		() =>
			brandSlug
				? [] // Hide brand filter on brand page (we're already viewing that brand)
				: brands.map((b: Brand) => ({ slug: b.slug, name: b.name })),
		[brandSlug, brands],
	);

	const collectionsForFilters = useMemo(
		() =>
			collections.map((co: Collection) => ({ slug: co.slug, name: co.name })),
		[collections],
	);

	// Merge products from all pages (same as dashboard)
	// Price filtering is now done server-side, so no need for client-side filtering
	const displayProducts = useMemo<ProductWithVariations[]>(
		() =>
			storeData?.pages
				?.flatMap((page) => (page?.products ?? []) as ProductWithVariations[])
				?.filter(Boolean) ?? [],
		[storeData?.pages],
	);

	// Scroll restoration for virtualized list
	const scrollEntry = useElementScrollRestoration({
		getElement: () => (typeof window !== "undefined" ? window : null),
	});

	// Create a stable cache key based on current filters and search
	const cacheKey = useMemo(() => {
		return JSON.stringify({
			search: normalizedSearch,
			category: categorySlug,
			brand: selectedBrand,
			collection: selectedCollection,
			attributeFilters: selectedAttributeFilters,
			sort: sortBy,
			columnsPerRow,
		});
	}, [
		normalizedSearch,
		categorySlug,
		selectedBrand,
		selectedCollection,
		selectedAttributeFilters,
		sortBy,
		columnsPerRow,
	]);

	// Show skeleton when: no data yet, or fetching (filter change) but not infinite-scroll load
	const showSkeleton = !storeData || (isFetching && !isFetchingNextPage);

	const filterProps = {
		brands: brandsForFilters,
		selectedBrand: selectedBrand,
		onBrandChange: updateBrand,
		collections: collectionsForFilters,
		selectedCollection: selectedCollection,
		onCollectionChange: updateCollection,
		storeLocations,
		selectedStoreLocation,
		onStoreLocationChange: updateStoreLocation,
		priceRange,
		currentPriceRange,
		onPriceRangeChange: setCurrentPriceRange,
		sortBy,
		onSortChange: (v: string) => {
			if (isValidSort(v)) updateSort(v);
		},
		attributeFilters,
		selectedAttributeFilters,
		onAttributeFilterChange: updateAttributeFilter,
		onFiltersOpen: () => setFiltersOpened(true),
	};

	const productContent = (
		<div className="product-feed-transition relative min-h-[200px]">
			{/* Content layer: grid or empty — fades out when loading */}
			<div
				className={`product-feed-content transition-opacity duration-300 ease-out ${showSkeleton ? "pointer-events-none opacity-0" : "opacity-100"}`}
			>
				{displayProducts.length === 0 ? (
					<EmptyState
						entityType="products"
						isSearchResult={!!normalizedSearch}
					/>
				) : (
					<>
						<VirtualizedProductList
							key={categorySlug ?? brandSlug ?? "all"}
							displayProducts={displayProducts}
							columnsPerRow={columnsPerRow}
							scrollEntry={scrollEntry}
							cacheKey={cacheKey}
							fetchNextPage={fetchNextPage}
							hasNextPage={hasNextPage ?? false}
							isFetchingNextPage={isFetchingNextPage}
							scrollRef={isDesktop ? productScrollRef : undefined}
						/>
						{isFetchingNextPage && (
							<div className="flex w-full items-center justify-center p-8">
								<p className="text-muted-foreground">Загрузка...</p>
							</div>
						)}
					</>
				)}
			</div>
			{/* Skeleton layer: overlays and fades in when loading */}
			<div
				className={`product-feed-skeleton absolute inset-0 transition-opacity duration-300 ease-out ${showSkeleton ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
				aria-hidden={!showSkeleton}
			>
				<ProductGridSkeleton itemCount={18} />
			</div>
		</div>
	);

	const pageTitle = categoryName ?? brand?.name ?? "Каталог";

	// Desktop: fill the content area (below navbar) so only the two columns scroll, never the page.
	// Use h-full so height comes from the layout chain (main = 100vh - navbar), not a guessed calc.
	if (isDesktop) {
		return (
			<div ref={containerRef} className="flex h-full overflow-hidden">
				<aside className="flex min-h-0 w-72 shrink-0 flex-col overflow-y-auto border-border border-r bg-background">
					<h1
						className="sticky top-0 z-999 border-border border-b px-4 py-3 text-3xl!"
						style={{
							backgroundColor:
								"color-mix(in oklch, var(--background) 80%, transparent)",
							backdropFilter: "blur(8px)",
							WebkitBackdropFilter: "blur(8px)",
						}}
					>
						{pageTitle}
					</h1>
					<div className="flex flex-col p-4 pt-0">
						<ProductFilters {...filterProps} variant="sidebar" />
					</div>
				</aside>
				<main
					ref={productScrollRef}
					className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
				>
					<div className="px-4 py-4">{productContent}</div>
				</main>
			</div>
		);
	}

	// Mobile: single column, window scroll, filter drawer
	return (
		<div ref={containerRef}>
			<h1 className="px-4 py-6 font-semibold text-2xl md:py-8 md:text-3xl">
				{pageTitle}
			</h1>
			<ProductFilters {...filterProps} />
			<div className="py-4">{productContent}</div>
		</div>
	);
});
