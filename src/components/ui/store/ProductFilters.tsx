import { memo, useCallback, useState } from "react";
import { Button } from "~/components/ui/shared/Button";
import {
	CheckboxList,
	type CheckboxListItem,
} from "~/components/ui/shared/CheckboxList";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerFooter,
} from "~/components/ui/shared/Drawer";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/shared/Select";
import { Slider } from "~/components/ui/shared/Slider";
import { useDeviceType } from "~/hooks/use-mobile";
import { usePrefetch } from "~/hooks/usePrefetch";
import type { AttributeFilter } from "~/server_functions/store/getAttributeValuesForFiltering";

interface ProductFiltersProps {
	brands?: { slug: string; name: string }[];
	selectedBrand?: string | null;
	onBrandChange?: (brand: string | null) => void;
	collections?: { slug: string; name: string }[];
	selectedCollection?: string | null;
	onCollectionChange?: (collection: string | null) => void;
	storeLocations?: { id: number; address: string }[];
	selectedStoreLocation?: number | null;
	onStoreLocationChange?: (locationId: number | null) => void;
	priceRange: {
		min: number;
		max: number;
	};
	currentPriceRange: [number, number];
	onPriceRangeChange?: (range: [number, number]) => void;
	sortBy?: string;
	onSortChange?: (sort: string) => void;
	attributeFilters?: AttributeFilter[];
	selectedAttributeFilters?: Record<number, string[]>; // attributeId -> array of value IDs (as strings)
	onAttributeFilterChange?: (attributeId: number, valueIds: string[]) => void;
	onFiltersOpen?: () => void; // Callback when filter drawer opens (for lazy loading)
}

const ProductFilters = memo(function ProductFilters({
	brands = [],
	selectedBrand = null,
	onBrandChange,
	collections = [],
	selectedCollection = null,
	onCollectionChange,
	storeLocations = [],
	selectedStoreLocation = null,
	onStoreLocationChange,
	priceRange,
	currentPriceRange,
	onPriceRangeChange,
	sortBy = "relevant",
	onSortChange,
	attributeFilters = [],
	selectedAttributeFilters = {},
	onAttributeFilterChange,
	onFiltersOpen,
}: ProductFiltersProps) {
	useDeviceType();
	// no masked backdrop needed in current layout

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const { prefetchFilterOptions } = usePrefetch();

	// Prefetch filter options when user hovers over filters button
	// Note: category is now in route params, not filter state
	const handleFiltersButtonHover = useCallback(() => {
		// Category will be passed from route context if needed
		prefetchFilterOptions(
			undefined, // Category comes from route, not filter state
			selectedBrand ?? undefined,
			selectedCollection ?? undefined,
			selectedAttributeFilters,
		);
	}, [
		prefetchFilterOptions,
		selectedBrand,
		selectedCollection,
		selectedAttributeFilters,
	]);

	// REACTIVE FILTERS: Changes apply immediately (no "Apply" button needed)
	// Local state is removed - we update global state directly

	// REACTIVE: Apply changes immediately
	const handlePriceRangeChange = useCallback(
		(newValue: number[]) => {
			const range: [number, number] = [newValue[0], newValue[1]];
			onPriceRangeChange?.(range);
		},
		[onPriceRangeChange],
	);

	const handleBrandChange = useCallback(
		(brand: string | null) => {
			onBrandChange?.(brand);
		},
		[onBrandChange],
	);

	const handleCollectionChange = useCallback(
		(collection: string | null) => {
			onCollectionChange?.(collection);
		},
		[onCollectionChange],
	);

	const handleStoreLocationChange = useCallback(
		(locationId: number | null) => {
			onStoreLocationChange?.(locationId);
		},
		[onStoreLocationChange],
	);

	const handleSortChange = useCallback(
		(sort: string) => {
			onSortChange?.(sort);
		},
		[onSortChange],
	);

	const handleAttributeFilterChange = useCallback(
		(attributeId: number) => (valueIds: string[]) => {
			onAttributeFilterChange?.(attributeId, valueIds);
		},
		[onAttributeFilterChange],
	);

	const hasAnyActiveFilters =
		(selectedBrand && selectedBrand.length > 0) ||
		(selectedCollection && selectedCollection.length > 0) ||
		selectedStoreLocation !== null ||
		currentPriceRange[0] !== priceRange.min ||
		currentPriceRange[1] !== priceRange.max ||
		Object.keys(selectedAttributeFilters).length > 0;

	const resetAll = () => {
		onBrandChange?.(null);
		onCollectionChange?.(null);
		onStoreLocationChange?.(null);
		onPriceRangeChange?.([priceRange.min, priceRange.max]);
		// Reset all attribute filters
		if (onAttributeFilterChange) {
			for (const attr of attributeFilters) {
				onAttributeFilterChange(attr.attributeId, []);
			}
		}
	};

	// Render filter content (shared between desktop and mobile)
	const renderFilterContent = () => {
		// Collect all filter sections to display in flex layout
		const filterSections = [];

		// Sort filter
		filterSections.push(
			<div key="sort" className="min-w-fit">
				<div className="mb-2 font-medium text-sm">Сортировка</div>
				<Select value={sortBy} onValueChange={handleSortChange}>
					<SelectTrigger className="field-sizing-content font-normal text-xs">
						<SelectValue placeholder="Выберите сортировку" />
					</SelectTrigger>
					<SelectContent className="bg-background font-normal text-xs">
						<SelectItem className="font-normal text-xs" value="relevant">
							По релевантности
						</SelectItem>
						<SelectItem className="font-normal text-xs" value="best-selling">
							Популярные
						</SelectItem>
						<SelectItem className="font-normal text-xs" value="price-asc">
							Сначала дешёвые
						</SelectItem>
						<SelectItem className="font-normal text-xs" value="price-desc">
							Сначала дорогие
						</SelectItem>
						<SelectItem className="font-normal text-xs" value="newest">
							Сначала новые
						</SelectItem>
					</SelectContent>
				</Select>
			</div>,
		);

		// Price range filter
		filterSections.push(
			<div key="price" className="min-w-fit">
				<Slider
					value={currentPriceRange}
					min={priceRange.min}
					max={priceRange.max}
					step={1}
					onValueChange={handlePriceRangeChange}
					showTooltip
					tooltipContent={(value) => `${value} р`}
					label="Цена"
				/>
			</div>,
		);

		// Brands filter - only show if more than 1 option
		if (brands.length > 1) {
			filterSections.push(
				<div key="brands" className="min-w-fit">
					<div className="mb-2 flex items-center justify-between">
						<div className="font-medium text-sm">Бренды</div>
					</div>
					<CheckboxList
						items={brands.map((brand) => ({
							id: brand.slug,
							label: brand.name,
						}))}
						selectedIds={selectedBrand ? [selectedBrand] : []}
						onItemChange={(itemId, checked) => {
							// Single-select behavior: if checked, select this one; if unchecked, clear selection
							const brandSlug = checked ? String(itemId) : null;
							handleBrandChange(brandSlug);
						}}
						idPrefix="filter-brand"
						scrollable={true}
						maxHeight="200px"
					/>
				</div>,
			);
		}

		// Collections filter - only show if more than 1 option
		if (collections.length > 1) {
			filterSections.push(
				<div key="collections" className="min-w-fit">
					<div className="mb-2 flex items-center justify-between">
						<div className="font-medium text-sm">Коллекции</div>
					</div>
					<CheckboxList
						items={collections.map((collection) => ({
							id: collection.slug,
							label: collection.name,
						}))}
						selectedIds={selectedCollection ? [selectedCollection] : []}
						onItemChange={(itemId, checked) => {
							// Single-select behavior: if checked, select this one; if unchecked, clear selection
							const collectionSlug = checked ? String(itemId) : null;
							handleCollectionChange(collectionSlug);
						}}
						idPrefix="filter-collection"
						scrollable={true}
						maxHeight="200px"
					/>
				</div>,
			);
		}

		// Store Locations filter - only show if more than 1 option
		if (storeLocations.length > 1) {
			filterSections.push(
				<div key="store-locations" className="min-w-fit">
					<div className="mb-2 flex items-center justify-between">
						<div className="font-medium text-sm">Адрес магазина</div>
					</div>
					<CheckboxList
						items={storeLocations.map((location) => ({
							id: location.id,
							label: location.address,
						}))}
						selectedIds={
							selectedStoreLocation !== null ? [selectedStoreLocation] : []
						}
						onItemChange={(itemId, checked) => {
							// Single-select behavior: if checked, select this one; if unchecked, clear selection
							const locationId = checked ? Number(itemId) : null;
							handleStoreLocationChange(locationId);
						}}
						idPrefix="filter-store-location"
						scrollable={true}
						maxHeight="200px"
					/>
				</div>,
			);
		}

		// Attribute filters - only show if more than 1 value option
		attributeFilters.forEach((attrFilter) => {
			// Skip if only 1 value available (no choice to make)
			if (attrFilter.values.length <= 1) return;

			const selectedValueIds =
				selectedAttributeFilters[attrFilter.attributeId] || [];
			// Convert to CheckboxList format
			const checkboxItems: CheckboxListItem[] = attrFilter.values.map((v) => ({
				id: v.id.toString(),
				label: v.value,
			}));

			const handleAttributeItemChange = (
				itemId: string | number,
				checked: boolean,
			) => {
				const currentSelection = selectedValueIds;
				const newSelection = checked
					? [...currentSelection, itemId.toString()]
					: currentSelection.filter((id) => id !== itemId.toString());
				handleAttributeFilterChange(attrFilter.attributeId)(newSelection);
			};

			filterSections.push(
				<div key={`attr-${attrFilter.attributeId}`} className="min-w-fit">
					<div className="mb-2 font-medium text-sm">
						{attrFilter.attributeName}
					</div>
					<CheckboxList
						items={checkboxItems}
						selectedIds={selectedValueIds}
						onItemChange={handleAttributeItemChange}
						idPrefix={`filter-attr-${attrFilter.attributeId}`}
						scrollable={true}
						maxHeight="200px"
					/>
				</div>,
			);
		});

		return (
			<div className="space-y-4">
				{/* Filters in flex row with wrap and space-between */}
				<div className="flex flex-row flex-wrap justify-between gap-x-4 gap-y-4">
					{filterSections}
				</div>
			</div>
		);
	};

	return (
		<>
			{/* Filters button - desktop and mobile */}
			<Button
				size="sm"
				onClick={() => {
					setIsDrawerOpen(true);
					onFiltersOpen?.(); // Trigger lazy loading
				}}
				onMouseEnter={handleFiltersButtonHover}
				className="md:-translate-x-1/2 fixed bottom-22 left-2 z-100 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-primary-foreground text-xs shadow-md md:bottom-4 md:left-1/2"
				aria-label="Открыть фильтры"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					className="h-4 w-4"
					aria-hidden="true"
					role="img"
				>
					<path
						fillRule="evenodd"
						d="M3 5.25A.75.75 0 0 1 3.75 4.5h16.5a.75.75 0 0 1 .53 1.28l-6.03 6.03v4.94a.75.75 0 0 1-1.06.67l-3-1.5a.75.75 0 0 1-.41-.67v-3.44L3.22 5.78A.75.75 0 0 1 3 5.25Z"
						clipRule="evenodd"
					/>
				</svg>
				Фильтры
			</Button>

			{/* Drawer - REACTIVE: Changes apply immediately */}
			<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<DrawerContent width="full" className="border-primary">
					<DrawerBody className="w-full">
						<div className="space-y-4">{renderFilterContent()}</div>
					</DrawerBody>

					<DrawerFooter className="border-border border-t bg-background px-4 sm:px-6 lg:px-8">
						<div className="flex w-full items-center justify-between">
							<div>
								{hasAnyActiveFilters ? (
									<Button
										type="button"
										variant="accent"
										size="sm"
										onClick={resetAll}
									>
										Сбросить все фильтры
									</Button>
								) : (
									<span className="font-semibold text-lg leading-none tracking-tight">
										Фильтры
									</span>
								)}
							</div>
							<Button
								variant="secondary"
								type="button"
								onClick={() => setIsDrawerOpen(false)}
							>
								Закрыть
							</Button>
						</div>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	);
});

export default ProductFilters;
