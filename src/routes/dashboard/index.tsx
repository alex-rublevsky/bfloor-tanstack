import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useElementScrollRestoration,
} from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AdminProductCard } from "~/components/ui/dashboard/AdminProductCard";
import { ProductsPageSkeleton } from "~/components/ui/dashboard/skeletons/ProductsPageSkeleton";
import { ActiveFiltersDisplay } from "~/components/ui/shared/ActiveFiltersDisplay";
import { EmptyState } from "~/components/ui/shared/EmptyState";
import { ProductGridSkeleton } from "~/components/ui/shared/ProductGridSkeleton";
import ProductFilters from "~/components/ui/store/ProductFilters";
import { getAllStoreLocations } from "~/data/storeLocations";
import {
	attributeValuesForFilteringDashboardQueryOptions,
	categoriesQueryOptions,
	filteredBrandsDashboardQueryOptions,
	filteredCollectionsDashboardQueryOptions,
	productsInfiniteQueryOptions,
} from "~/lib/queryOptions";
import type {
	Brand,
	CategoryWithCount,
	Collection,
	ProductWithVariations,
} from "~/types";

// Zod schema for search params validation
const searchParamsSchema = z.object({
	search: z
		.union([z.string(), z.number()])
		.transform((val) => (typeof val === "number" ? String(val) : val))
		.optional(),
	category: z.string().optional(),
	brand: z.string().optional(),
	collection: z.string().optional(),
	storeLocation: z.number().optional(),
	attributeFilters: z.string().optional(), // JSON string of Record<number, string[]>
	sort: z
		.enum(["relevant", "name", "price-asc", "price-desc", "newest", "oldest"])
		.optional(),
});

// Default values for search params (used for stripping defaults from URL)
const defaultSearchValues = {
	sort: "relevant" as const,
};

export const Route = createFileRoute("/dashboard/")({
	component: RouteComponent,
	pendingComponent: ProductsPageSkeleton,
	validateSearch: zodValidator(searchParamsSchema),
	// Strip default values from URL to keep it clean
	search: {
		middlewares: [stripSearchParams(defaultSearchValues)],
	},
});

// Hook to get responsive columns per row based on screen size
function useResponsiveColumns() {
	const [columnsPerRow, setColumnsPerRow] = useState(6);

	useEffect(() => {
		const updateColumns = () => {
			const width = window.innerWidth;
			if (width >= 1536) {
				setColumnsPerRow(6); // 2xl
			} else if (width >= 1280) {
				setColumnsPerRow(5); // xl
			} else if (width >= 1024) {
				setColumnsPerRow(4); // lg
			} else if (width >= 768) {
				setColumnsPerRow(3); // md
			} else {
				setColumnsPerRow(2); // sm and below
			}
		};

		// Set initial value
		updateColumns();

		// Update on resize
		window.addEventListener("resize", updateColumns);
		return () => window.removeEventListener("resize", updateColumns);
	}, []);

	return columnsPerRow;
}

function RouteComponent() {
	// Get search params from URL using TanStack Router
	const searchParams = Route.useSearch();
	const navigate = Route.useNavigate();

	// Normalize search term - Zod schema ensures search is always a string (or undefined)
	const normalizedSearch = (() => {
		const rawValue = searchParams.search ?? "";
		const trimmed = rawValue.trim().replace(/\s+/g, " ");
		return trimmed.length >= 2 ? trimmed : undefined;
	})();
	const containerRef = useRef<HTMLDivElement>(null);
	const columnsPerRow = useResponsiveColumns();

	// Parse attribute filters from URL
	const parseAttributeFilters = useCallback(
		(attrFiltersStr?: string): Record<number, string[]> => {
			if (!attrFiltersStr) return {};
			try {
				const parsed = JSON.parse(attrFiltersStr);
				if (typeof parsed === "object" && parsed !== null) {
					// Convert string keys to numbers
					const result: Record<number, string[]> = {};
					for (const [key, value] of Object.entries(parsed)) {
						const numKey = parseInt(key, 10);
						if (!Number.isNaN(numKey) && Array.isArray(value)) {
							result[numKey] = value.map(String);
						}
					}
					return result;
				}
			} catch {
				// Invalid JSON, return empty object
			}
			return {};
		},
		[],
	);

	// Initialize filter state from URL search params
	const [selectedCategory, setSelectedCategory] = useState<string | null>(
		searchParams.category ?? null,
	);
	const [selectedBrand, setSelectedBrand] = useState<string | null>(
		searchParams.brand ?? null,
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
		| "relevant"
		| "name"
		| "price-asc"
		| "price-desc"
		| "newest"
		| "oldest"
		| "best-selling"
	>(searchParams.sort ?? "relevant");
	const [currentPriceRange, setCurrentPriceRange] = useState<[number, number]>([
		0, 1000000,
	]);

	// Sync state with URL when search params change (e.g., from browser back/forward)
	useEffect(() => {
		setSelectedCategory(searchParams.category ?? null);
		setSelectedBrand(searchParams.brand ?? null);
		setSelectedCollection(searchParams.collection ?? null);
		setSelectedStoreLocation(searchParams.storeLocation ?? null);
		setSelectedAttributeFilters(
			parseAttributeFilters(searchParams.attributeFilters),
		);
		setSortBy(searchParams.sort ?? "relevant");
	}, [
		searchParams.category,
		searchParams.brand,
		searchParams.collection,
		searchParams.storeLocation,
		searchParams.attributeFilters,
		searchParams.sort,
		parseAttributeFilters,
	]);

	const isValidSort = (v: string): v is typeof sortBy => {
		return (
			v === "relevant" ||
			v === "name" ||
			v === "price-asc" ||
			v === "price-desc" ||
			v === "newest" ||
			v === "oldest"
		);
	};

	// Update URL when filters change - using functional form as recommended by TanStack Router
	const updateCategory = (category: string | null) => {
		setSelectedCategory(category);
		navigate({
			search: (prev) => ({
				...prev,
				category: category ?? undefined,
			}),
			replace: true,
		});
	};

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
				sort: sort !== "relevant" ? sort : undefined,
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

	// Use infinite query to track loading state
	const {
		data: productsData,
		isFetching,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		...productsInfiniteQueryOptions(normalizedSearch, {
			categorySlug: selectedCategory ?? undefined,
			brandSlug: selectedBrand ?? undefined,
			collectionSlug: selectedCollection ?? undefined,
			storeLocationId: selectedStoreLocation ?? undefined,
			attributeFilters: selectedAttributeFilters,
			minPrice: currentPriceRange[0] !== 0 ? currentPriceRange[0] : undefined,
			maxPrice:
				currentPriceRange[1] !== 1000000 ? currentPriceRange[1] : undefined,
			sort: sortBy,
		}),
	});

	// Fetch attribute filters based on current filters (including attribute filters)
	// This ensures only values available in the current filtered product set are shown
	const { data: attributeFilters = [] } = useQuery({
		...attributeValuesForFilteringDashboardQueryOptions(
			selectedCategory ?? undefined,
			selectedBrand ?? undefined,
			selectedCollection ?? undefined,
			selectedAttributeFilters,
			selectedStoreLocation ?? undefined,
		),
	});

	// Fetch filtered brands and collections based on current filters
	const { data: brands = [] } = useQuery({
		...filteredBrandsDashboardQueryOptions(
			selectedCategory ?? undefined,
			selectedCollection ?? undefined,
			selectedStoreLocation ?? undefined,
		),
	});

	const { data: collections = [] } = useQuery({
		...filteredCollectionsDashboardQueryOptions(
			selectedCategory ?? undefined,
			selectedBrand ?? undefined,
			selectedStoreLocation ?? undefined,
		),
	});

	const { data: categories = [] } = useQuery({
		...categoriesQueryOptions(),
	});

	// Get store locations (hardcoded data)
	const storeLocations = getAllStoreLocations();

	// Listen for action button clicks from navbar - navigate to create page
	useEffect(() => {
		const handleAction = () => {
			window.location.href = "/dashboard/products/new";
		};

		window.addEventListener("dashboardAction", handleAction);
		return () => window.removeEventListener("dashboardAction", handleAction);
	}, []);

	const formatPrice = (price: number | string | null): string => {
		if (price === null) return "$0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "р",
		}).format(numericPrice);
	};

	// Merge products from all pages
	const products =
		productsData?.pages
			?.flatMap((page) => page?.products ?? [])
			?.filter(Boolean) ?? [];

	// Debug logging removed

	// Use merged products directly (search is applied server-side)
	const allProducts = products;

	// Server-side filtered list
	const displayProducts = allProducts;

	// Scroll restoration for virtualized list
	// Following TanStack Router docs: https://tanstack.com/router/v1/docs/framework/react/guide/scroll-restoration#manual-scroll-restoration
	const scrollEntry = useElementScrollRestoration({
		getElement: () => window,
	});

	// Virtualizer configuration - responsive columns handled by useResponsiveColumns hook
	// Using dynamic sizing: row heights are unknown until rendered, so we estimate and measure
	// Following TanStack Virtual dynamic example pattern: https://tanstack.com/virtual/latest/docs/framework/react/examples/dynamic
	// Simply use measureElement ref - virtualizer handles everything automatically
	const estimatedRowHeight = 365;
	const rowCount = Math.ceil(displayProducts.length / columnsPerRow);

	const virtualizer = useWindowVirtualizer({
		count: rowCount,
		estimateSize: () => estimatedRowHeight,
		overscan: 8,
		initialOffset: scrollEntry?.scrollY,
	});

	// Re-measure rows when the number of columns changes (affects row layout)
	// biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally re-measure when columns change
	useEffect(() => {
		virtualizer.measure();
	}, [columnsPerRow, virtualizer]);

	// Helper function to get products for a specific row
	const getProductsForRow = (rowIndex: number) => {
		const startIndex = rowIndex * columnsPerRow;
		const endIndex = Math.min(
			startIndex + columnsPerRow,
			displayProducts.length,
		);
		return displayProducts.slice(startIndex, endIndex);
	};

	// Infinite scroll - load more products when user scrolls near the end
	const virtualItems = virtualizer.getVirtualItems();
	useEffect(() => {
		const lastItem = virtualItems[virtualItems.length - 1];

		// Don't fetch if already fetching, no next page, or no items rendered
		if (!lastItem || !hasNextPage || isFetchingNextPage) return;

		// Fetch next page when user scrolls near the end
		// lastItem.index is the row index, rowCount is total rows
		// Trigger when within 15 rows of the end (prefetch for smooth scrolling)
		const threshold = rowCount - 4;

		if (lastItem.index >= threshold) {
			fetchNextPage();
		}
	}, [virtualItems, hasNextPage, isFetchingNextPage, rowCount, fetchNextPage]);

	// Determine if we should show the skeleton
	// Show skeleton only when:
	// 1. No data yet (!productsData)
	// 2. Fetching initial data or filter changes (isFetching && !isFetchingNextPage)
	// Don't show skeleton when just fetching next page for infinite scroll
	const showSkeleton = !productsData || (isFetching && !isFetchingNextPage);

	return (
		<>
			{/* Filters bar (reusing store ProductFilters for hide-on-scroll behavior) */}
			<div ref={containerRef}>
				<ProductFilters
					categories={categories.map(
						(c): CategoryWithCount => ({
							...c,
							count: 0,
						}),
					)}
					selectedCategory={selectedCategory}
					onCategoryChange={updateCategory}
					brands={brands.map((b: Brand) => ({ slug: b.slug, name: b.name }))}
					selectedBrand={selectedBrand}
					onBrandChange={updateBrand}
					collections={collections.map((co: Collection) => ({
						slug: co.slug,
						name: co.name,
					}))}
					selectedCollection={selectedCollection}
					onCollectionChange={updateCollection}
					storeLocations={storeLocations}
					selectedStoreLocation={selectedStoreLocation}
					onStoreLocationChange={updateStoreLocation}
					priceRange={{ min: 0, max: 1000000 }}
					currentPriceRange={currentPriceRange}
					onPriceRangeChange={setCurrentPriceRange}
					sortBy={sortBy}
					onSortChange={(v) => {
						if (isValidSort(v)) updateSort(v);
					}}
					attributeFilters={attributeFilters}
					selectedAttributeFilters={selectedAttributeFilters}
					onAttributeFilterChange={updateAttributeFilter}
				/>
				{/* Active Filters Display - Always show, even during loading */}
				<ActiveFiltersDisplay
					categories={categories.map(
						(c): CategoryWithCount => ({
							...c,
							count: 0,
						}),
					)}
					selectedCategory={selectedCategory}
					brands={brands}
					selectedBrand={selectedBrand}
					collections={collections}
					selectedCollection={selectedCollection}
					storeLocations={storeLocations}
					selectedStoreLocation={selectedStoreLocation}
					attributeFilters={attributeFilters}
					selectedAttributeFilters={selectedAttributeFilters}
					onRemoveBrand={() => updateBrand(null)}
					onRemoveCollection={() => updateCollection(null)}
					onRemoveStoreLocation={() => updateStoreLocation(null)}
					onRemoveAttributeValue={(attributeId, valueId) => {
						const currentValues = selectedAttributeFilters[attributeId] || [];
						const newValues = currentValues.filter((id) => id !== valueId);
						updateAttributeFilter(attributeId, newValues);
					}}
				/>
				{/* Products List - Show skeleton during loading, otherwise show products */}
				{showSkeleton ? (
					<ProductGridSkeleton itemCount={18} gridClassName="px-4" />
				) : displayProducts.length === 0 ? (
					<EmptyState
						entityType="products"
						isSearchResult={!!normalizedSearch}
					/>
				) : (
					<>
						<div
							className="relative px-4 py-4"
							style={{
								height: `${virtualizer.getTotalSize()}px`,
								width: "100%",
								position: "relative",
							}}
						>
							{/* Dynamic sizing: Following TanStack Virtual documentation pattern */}
							{/* Simply use measureElement ref - virtualizer handles everything automatically */}
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const rowProducts = getProductsForRow(virtualRow.index);
								return (
									<div
										key={virtualRow.key}
										data-index={virtualRow.index}
										ref={virtualizer.measureElement}
										className="virtualized-row"
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											// Critical: No height constraint - let content determine height
											// The virtualizer will measure this element's natural height
											transform: `translateY(${virtualRow.start}px)`,
										}}
									>
										{/* Grid container - height determined by tallest card in row */}
										{/* CSS Grid automatically makes container height = tallest item */}
										{/* Add bottom margin to create spacing between rows */}
										<div
											className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
											style={{ marginBottom: "0.75rem" }}
										>
											{rowProducts.map((product: ProductWithVariations) => (
												<AdminProductCard
													key={product.id}
													product={product}
													formatPrice={formatPrice}
												/>
											))}
										</div>
									</div>
								);
							})}
						</div>
						{/* Loading indicator for next page */}
						{isFetchingNextPage && (
							<div className="flex w-full items-center justify-center p-8">
								<p className="text-muted-foreground">Загрузка...</p>
							</div>
						)}
					</>
				)}
			</div>
		</>
	);
}
