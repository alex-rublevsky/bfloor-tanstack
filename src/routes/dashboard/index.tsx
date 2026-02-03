import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	stripSearchParams,
	useElementScrollRestoration,
} from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type OnChangeFn,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import DashboardFilters from "~/components/ui/dashboard/DashboardFilters";
import { ProductsPageSkeleton } from "~/components/ui/dashboard/skeletons/ProductsPageSkeleton";
import { Button } from "~/components/ui/shared/Button";
import { Checkbox } from "~/components/ui/shared/Checkbox";
import { EmptyState } from "~/components/ui/shared/EmptyState";
import { Icon } from "~/components/ui/shared/Icon";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { getAllStoreLocations } from "~/data/storeLocations";
import { usePrefetch } from "~/hooks/usePrefetch";
import {
	attributeValuesForFilteringDashboardQueryOptions,
	categoriesQueryOptions,
	filteredBrandsDashboardQueryOptions,
	filteredCollectionsDashboardQueryOptions,
	productCategoryCountsQueryOptions,
	productsInfiniteQueryOptions,
} from "~/lib/queryOptions";
import { bulkDeleteProducts } from "~/server_functions/dashboard/store/bulkDeleteProducts";
import type { Brand, Collection, ProductWithVariations } from "~/types";
import { seedDashboardProductCache } from "~/utils/dashboardCache";

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
		.enum(["name", "price-asc", "price-desc", "newest", "oldest"])
		.optional(),
});

// Default values for search params (used for stripping defaults from URL)
const defaultSearchValues = {
	sort: "name" as const,
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

	// Track if filter drawer has been opened (for lazy loading attribute filters on mobile)
	const [filtersOpened, setFiltersOpened] = useState(false);

	// Bulk delete state
	const [isDeleting, setIsDeleting] = useState(false);
	const queryClient = useQueryClient();
	const { prefetchDashboardProduct } = usePrefetch();

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
		"name" | "price-asc" | "price-desc" | "newest" | "oldest"
	>(searchParams.sort ?? "name");

	// Table sorting state
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState({});

	// Sync state with URL when search params change (e.g., from browser back/forward)
	useEffect(() => {
		setSelectedCategory(searchParams.category ?? null);
		setSelectedBrand(searchParams.brand ?? null);
		setSelectedCollection(searchParams.collection ?? null);
		setSelectedStoreLocation(searchParams.storeLocation ?? null);
		setSelectedAttributeFilters(
			parseAttributeFilters(searchParams.attributeFilters),
		);
		const newSortBy = searchParams.sort ?? "name";
		setSortBy(newSortBy);

		// Sync table sorting state with URL sort param
		const newSorting: SortingState = [];
		if (newSortBy === "name") {
			newSorting.push({ id: "name", desc: false });
		} else if (newSortBy === "price-asc") {
			newSorting.push({ id: "price", desc: false });
		} else if (newSortBy === "price-desc") {
			newSorting.push({ id: "price", desc: true });
		} else if (newSortBy === "newest") {
			newSorting.push({ id: "id", desc: false });
		} else if (newSortBy === "oldest") {
			newSorting.push({ id: "id", desc: true });
		}
		setSorting(newSorting);
	}, [
		searchParams.category,
		searchParams.brand,
		searchParams.collection,
		searchParams.storeLocation,
		searchParams.attributeFilters,
		searchParams.sort,
		parseAttributeFilters,
	]);

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
			sort: sortBy,
		}),
	});

	// Fetch attribute filters: always fetch on desktop, on mobile only after drawer opened
	const { data: attributeFilters = [] } = useQuery({
		...attributeValuesForFilteringDashboardQueryOptions(
			selectedCategory ?? undefined,
			selectedBrand ?? undefined,
			selectedCollection ?? undefined,
			selectedAttributeFilters,
			selectedStoreLocation ?? undefined,
		),
		enabled: filtersOpened || true, // Always enabled for now, can optimize for mobile later
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

	// Load category counts
	const { data: categoryCounts = {} } = useQuery(
		productCategoryCountsQueryOptions(),
	);

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

	// Merge products from all pages
	const flatData = useMemo(
		() =>
			productsData?.pages
				?.flatMap((page) => page?.products ?? [])
				?.filter(Boolean) ?? [],
		[productsData],
	);

	// Create lookup maps for categories and brands
	const categoryMap = useMemo(() => {
		const map = new Map<string, { name: string }>();
		for (const cat of categories) {
			map.set(cat.slug, { name: cat.name });
		}
		return map;
	}, [categories]);

	const brandMap = useMemo(() => {
		const map = new Map<string, { name: string; image: string | null }>();
		for (const brand of brands) {
			map.set(brand.slug, { name: brand.name, image: brand.image });
		}
		return map;
	}, [brands]);

	// Define table columns
	const columns: ColumnDef<ProductWithVariations>[] = useMemo(
		() => [
			{
				id: "select",
				header: ({ table }) => {
					const isAllSelected = table.getIsAllRowsSelected();
					const isSomeSelected = table.getIsSomeRowsSelected();
					return (
						<Checkbox
							checked={
								isAllSelected ? true : isSomeSelected ? "indeterminate" : false
							}
							onCheckedChange={(value) => {
								table.toggleAllRowsSelected(!!value);
							}}
						/>
					);
				},
				cell: ({ row }) => (
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						className="flex items-center"
					>
						<Checkbox
							checked={row.getIsSelected()}
							disabled={!row.getCanSelect()}
							onCheckedChange={(value) => {
								row.toggleSelected(!!value);
							}}
						/>
					</button>
				),
				size: 50,
			},
			{
				accessorKey: "images",
				header: "Фото",
				cell: ({ row }) => {
					const product = row.original;
					const imageArray = (() => {
						if (!product.images) return [];
						try {
							return JSON.parse(product.images) as string[];
						} catch {
							return product.images
								.split(",")
								.map((img) => img.trim())
								.filter(Boolean);
						}
					})();
					const primaryImage = imageArray[0];

					return (
						<div className="relative h-16 w-16 overflow-hidden rounded-md">
							{primaryImage ? (
								<img
									src={`${ASSETS_BASE_URL}/${primaryImage}`}
									alt={product.name}
									className="h-full w-full object-cover"
									style={{
										viewTransitionName: `product-image-${product.slug}`,
									}}
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-xs">
									No image
								</div>
							)}
						</div>
					);
				},
				size: 100,
			},
			{
				accessorKey: "name",
				header: "Название",
				cell: ({ getValue }) => (
					<div className="max-w-xs truncate">{getValue() as string}</div>
				),
				size: 300,
			},
			{
				accessorKey: "price",
				header: "Цена",
				cell: ({ row }) => {
					const product = row.original;
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

					return (
						<div className="flex items-baseline gap-1">
							{product.discount ? (
								<>
									<span className="font-medium">
										{Math.round(displayPrice * (1 - product.discount / 100))} р
									</span>
									<span className="text-muted-foreground text-xs line-through">
										{Math.round(displayPrice)}
									</span>
									<span className="rounded bg-green-100 px-1 py-0.5 text-green-800 text-xs">
										-{product.discount}%
									</span>
								</>
							) : (
								<span className="font-medium">
									{Math.round(displayPrice)} р
								</span>
							)}
						</div>
					);
				},
				size: 150,
			},
			{
				accessorKey: "categorySlug",
				header: "Категория",
				cell: ({ getValue }) => {
					const slug = getValue() as string | null;
					if (!slug) return <span className="text-muted-foreground">—</span>;
					const category = categoryMap.get(slug);
					return category ? (
						<span>{category.name}</span>
					) : (
						<span className="text-muted-foreground">{slug}</span>
					);
				},
				size: 150,
			},
			{
				accessorKey: "brandSlug",
				header: "Бренд",
				cell: ({ getValue }) => {
					const slug = getValue() as string | null;
					if (!slug) return <span className="text-muted-foreground">—</span>;
					const brand = brandMap.get(slug);
					if (!brand) {
						return <span className="text-muted-foreground">{slug}</span>;
					}
					return brand.image ? (
						<div className="-mx-4 -my-3 flex h-full w-full items-center justify-center p-2">
							<img
								src={`${ASSETS_BASE_URL}/${brand.image}`}
								alt={brand.name}
								title={brand.name}
								className="h-full w-full object-contain"
							/>
						</div>
					) : (
						<span>{brand.name}</span>
					);
				},
				size: 100,
			},
			{
				accessorKey: "viewCount",
				header: "Просмотры",
				size: 110,
			},
		],
		[categoryMap, brandMap],
	);

	// Scroll restoration - window scroll
	const scrollEntry = useElementScrollRestoration({
		getElement: () => window,
	});

	// Handle table sorting changes - convert to server-side sort
	const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
		const newSorting =
			typeof updater === "function" ? updater(sorting) : updater;
		setSorting(newSorting);

		// Convert TanStack Table sorting to our sort format
		let newSortBy: "name" | "price-asc" | "price-desc" | "newest" | "oldest" =
			"name";

		if (newSorting.length > 0) {
			const sort = newSorting[0];
			const { id, desc } = sort;

			// Map column id to our sort format
			if (id === "name") {
				newSortBy = "name";
			} else if (id === "price") {
				newSortBy = desc ? "price-desc" : "price-asc";
			} else if (id === "id") {
				newSortBy = desc ? "oldest" : "newest";
			}
		}

		// Update sort state and URL
		setSortBy(newSortBy);
		navigate({
			search: (prev) => ({
				...prev,
				sort: newSortBy === "name" ? undefined : newSortBy,
			}),
			replace: true,
		});

		// Scroll to top when sorting changes
		if (table.getRowModel().rows.length) {
			rowVirtualizer.scrollToIndex?.(0);
		}
	};

	// Create table instance
	const table = useReactTable({
		data: flatData,
		// @ts-expect-error - TanStack Table has complex union types that TypeScript struggles with
		columns,
		state: {
			sorting,
			rowSelection,
		},
		onSortingChange: handleSortingChange,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		// Removed getSortedRowModel() - using server-side sorting
		manualSorting: true, // Enable server-side sorting
		enableRowSelection: true,
		debugTable: true,
	});

	const { rows } = table.getRowModel();

	// Virtualizer for table rows - window-based scrolling
	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => 65,
		overscan: 10,
		initialOffset: scrollEntry?.scrollY,
	});

	// Infinite scroll - load more when scrolling near bottom
	const virtualItems = rowVirtualizer.getVirtualItems();
	useEffect(() => {
		const lastItem = virtualItems[virtualItems.length - 1];
		if (!lastItem || !hasNextPage || isFetchingNextPage) return;

		// Fetch when within 10 rows of the end
		const threshold = rows.length - 10;
		if (lastItem.index >= threshold) {
			fetchNextPage();
		}
	}, [
		virtualItems,
		hasNextPage,
		isFetchingNextPage,
		rows.length,
		fetchNextPage,
	]);

	// Determine if we should show the skeleton
	const showSkeleton = !productsData || (isFetching && !isFetchingNextPage);

	// Get selected rows count and IDs
	const selectedCount = Object.keys(rowSelection).length;
	const selectedProductIds = useMemo(() => {
		return Object.keys(rowSelection)
			.map((index) => flatData[Number(index)]?.id)
			.filter((id): id is number => id !== undefined);
	}, [rowSelection, flatData]);

	// Handle bulk delete
	const handleBulkDelete = async () => {
		if (selectedProductIds.length === 0) return;

		const confirmed = window.confirm(
			`Вы уверены, что хотите удалить ${selectedProductIds.length} товар${selectedProductIds.length === 1 ? "" : "ов"}?`,
		);

		if (!confirmed) return;

		setIsDeleting(true);
		try {
			await bulkDeleteProducts({ data: { ids: selectedProductIds } });

			// Clear selection
			setRowSelection({});

			// Invalidate queries to refetch data
			await queryClient.invalidateQueries({
				queryKey: ["bfloorDashboardProductsInfinite"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["productCategoryCounts"],
			});

			// Success feedback (optional - could add toast notification)
			console.log("Products deleted successfully");
		} catch (error) {
			console.error("Failed to delete products:", error);
			alert("Ошибка при удалении товаров");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div>
			{/* Sticky Filters and Table Header Container */}
			<div className="dashboard-sticky-filters sticky z-9999 overflow-visible border-border border-b bg-background/80 backdrop-blur-sm">
				{/* Filters Bar */}
				<DashboardFilters
					categories={categories.map((c) => ({
						slug: c.slug,
						name: c.name,
						count: categoryCounts[c.slug] ?? 0,
					}))}
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
					attributeFilters={attributeFilters}
					selectedAttributeFilters={selectedAttributeFilters}
					onAttributeFilterChange={updateAttributeFilter}
					onFiltersOpen={() => setFiltersOpened(true)}
				/>

				{/* Selection Info */}
				{selectedCount > 0 && (
					<div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-4 py-2">
						<span className="text-sm">
							Выбрано: {selectedCount} товар
							{selectedCount === 1 ? "" : selectedCount < 5 ? "а" : "ов"}
						</span>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setRowSelection({})}
								disabled={isDeleting}
							>
								Отменить
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleBulkDelete}
								disabled={isDeleting}
							>
								<Icon name="trash" className="mr-1.5 h-4 w-4" />
								{isDeleting ? "Удаление..." : "Удалить"}
							</Button>
						</div>
					</div>
				)}

				{/* Table Header - only show when there's data */}
				{!showSkeleton && flatData.length > 0 && (
					<div className="border-t bg-background">
						<div className="px-4">
							{table.getHeaderGroups().map((headerGroup) => (
								<div key={headerGroup.id} className="flex border-b">
									{headerGroup.headers.map((header) => {
										const canSort = header.column.getCanSort();
										return (
											<div
												key={header.id}
												className="flex items-center border-r px-4 py-3 text-left font-medium text-sm last:border-r-0"
												style={{ width: header.getSize() }}
											>
												{canSort ? (
													<button
														type="button"
														className="flex cursor-pointer select-none items-center gap-2"
														onClick={header.column.getToggleSortingHandler()}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																header.column.getToggleSortingHandler()?.(e);
															}
														}}
													>
														{flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
														{{
															asc: " 🔼",
															desc: " 🔽",
														}[header.column.getIsSorted() as string] ?? null}
													</button>
												) : (
													<div className="flex items-center gap-2">
														{flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
													</div>
												)}
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Table Content */}
			{showSkeleton ? (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">Loading products...</p>
				</div>
			) : flatData.length === 0 ? (
				<div className="px-4 py-8">
					<EmptyState
						entityType="products"
						isSearchResult={!!normalizedSearch}
					/>
				</div>
			) : (
				<div className="px-4">
					<div
						className="relative"
						style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
					>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							const row = rows[virtualRow.index];
							const productId = row.original.id;

							return (
								<Link
									key={row.id}
									to="/dashboard/products/$productId/edit"
									params={{ productId: String(productId) }}
									data-index={virtualRow.index}
									ref={(node) => rowVirtualizer.measureElement(node)}
									className="absolute left-0 flex w-full border-b transition-colors hover:bg-muted/50"
									style={{
										transform: `translateY(${virtualRow.start}px)`,
									}}
									viewTransition={true}
									preload="intent"
									onMouseEnter={() => {
										// Seed cache with list data for instant navigation
										seedDashboardProductCache(queryClient, productId);
										// Also prefetch to ensure fresh data
										prefetchDashboardProduct(productId);
									}}
								>
									{row.getVisibleCells().map((cell) => (
										<div
											key={cell.id}
											className="flex items-center border-r px-4 py-3 text-sm last:border-r-0"
											style={{ width: cell.column.getSize() }}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</div>
									))}
								</Link>
							);
						})}
					</div>
					{isFetchingNextPage && (
						<div className="flex w-full items-center justify-center p-4">
							<p className="text-muted-foreground">Loading more...</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
