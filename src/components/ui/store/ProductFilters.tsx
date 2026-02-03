import { memo, useCallback, useEffect, useRef, useState } from "react";
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
import { FilterGroup } from "~/components/ui/shared/FilterGroup";
import { Select } from "~/components/ui/shared/Select";
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
	/** When "sidebar", renders only filter content (no button/drawer). When "drawer", shows floating button + drawer. */
	variant?: "drawer" | "sidebar";
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
	sortBy = "best-selling",
	onSortChange,
	attributeFilters = [],
	selectedAttributeFilters = {},
	onAttributeFilterChange,
	onFiltersOpen,
	variant = "drawer",
}: ProductFiltersProps) {
	useDeviceType();
	// no masked backdrop needed in current layout

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	// Load filter options when sidebar is shown (desktop)
	useEffect(() => {
		if (variant === "sidebar") onFiltersOpen?.();
	}, [variant, onFiltersOpen]);
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

	// Price slider: local state during drag; commit (fetch + reset button) only on release
	const [sliderPriceRange, setSliderPriceRange] =
		useState<[number, number]>(currentPriceRange);
	const isDraggingPriceRef = useRef(false);

	useEffect(() => {
		if (!isDraggingPriceRef.current) {
			setSliderPriceRange(currentPriceRange);
		}
	}, [currentPriceRange]);

	const handlePriceRangeChange = useCallback((newValue: number[]) => {
		isDraggingPriceRef.current = true;
		setSliderPriceRange([newValue[0], newValue[1]]);
	}, []);

	const handlePriceRangeCommit = useCallback(
		(newValue: number[]) => {
			isDraggingPriceRef.current = false;
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
				<div className="mb-1 font-medium text-sm">Сортировка</div>
				<Select
					value={sortBy}
					onValueChange={handleSortChange}
					className="field-sizing-content font-normal"
					disableSelectedStyling={true}
					options={[
						{ value: "best-selling", label: "Популярные" },
						{ value: "price-asc", label: "Сначала дешёвые" },
						{ value: "price-desc", label: "Сначала дорогие" },
						{ value: "newest", label: "Сначала новые" },
					]}
				/>
			</div>,
		);

		// Price range filter (always show; bounds come from current filter set)
		filterSections.push(
			<div key="price" className="min-w-fit">
				<Slider
					value={sliderPriceRange}
					min={priceRange.min}
					max={priceRange.max}
					step={1}
					onValueChange={handlePriceRangeChange}
					onValueCommit={handlePriceRangeCommit}
					inputClassName="h-9 font-digital-mono text-base"
					label="Цена"
				/>
			</div>,
		);

		// Brands filter - only show if more than 1 option
		if (brands.length > 1) {
			filterSections.push(
				<div key="brands" className="min-w-fit">
					<div className="mb-1 flex items-center justify-between">
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
					<div className="mb-1 flex items-center justify-between">
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
					<div className="mb-1 flex items-center justify-between">
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
					<div className="mb-1 font-medium text-sm">
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

		return <div className="flex flex-col gap-4">{filterSections}</div>;
	};

	// Mobile drawer: horizontal scrolling pill buttons (same component as ProductCard variations, bigger size)
	const renderFilterContentMobile = () => {
		const pillSectionClass =
			"min-w-0 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1";
		const sections = [];

		// Sort
		sections.push(
			<div key="sort" className="min-w-fit">
				<div className="mb-1 font-medium text-sm">Сортировка</div>
				<Select
					value={sortBy}
					onValueChange={handleSortChange}
					className="field-sizing-content font-normal"
					disableSelectedStyling={true}
					options={[
						{ value: "best-selling", label: "Популярные" },
						{ value: "price-asc", label: "Сначала дешёвые" },
						{ value: "price-desc", label: "Сначала дорогие" },
						{ value: "newest", label: "Сначала новые" },
					]}
				/>
			</div>,
		);

		// Price (always show; bounds from current filter set)
		sections.push(
			<div key="price" className="min-w-fit">
				<Slider
					value={sliderPriceRange}
					min={priceRange.min}
					max={priceRange.max}
					step={1}
					onValueChange={handlePriceRangeChange}
					onValueCommit={handlePriceRangeCommit}
					inputClassName="h-9 font-digital-mono text-base"
					label="Цена"
				/>
			</div>,
		);

		// Brands – horizontal pills
		if (brands.length > 1) {
			sections.push(
				<div key="brands" className="min-w-0">
					<FilterGroup
						title="Бренды"
						options={brands}
						selectedOptions={selectedBrand}
						onOptionChange={(slug: string | null) => handleBrandChange(slug)}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		// Collections – horizontal pills
		if (collections.length > 1) {
			sections.push(
				<div key="collections" className="min-w-0">
					<FilterGroup
						title="Коллекции"
						options={collections}
						selectedOptions={selectedCollection}
						onOptionChange={(slug: string | null) =>
							handleCollectionChange(slug)
						}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		// Store locations – horizontal pills (slug = id as string)
		if (storeLocations.length > 1) {
			sections.push(
				<div key="store-locations" className="min-w-0">
					<FilterGroup
						title="Адрес магазина"
						options={storeLocations.map((loc) => ({
							slug: String(loc.id),
							name: loc.address,
						}))}
						selectedOptions={
							selectedStoreLocation !== null
								? String(selectedStoreLocation)
								: null
						}
						onOptionChange={(slug: string | null) =>
							handleStoreLocationChange(slug ? Number(slug) : null)
						}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		// Attribute filters – horizontal pills, multi-select
		attributeFilters.forEach((attrFilter) => {
			if (attrFilter.values.length <= 1) return;
			const selectedValueIds =
				selectedAttributeFilters[attrFilter.attributeId] || [];
			sections.push(
				<div key={`attr-${attrFilter.attributeId}`} className="min-w-0">
					<FilterGroup
						title={attrFilter.attributeName}
						options={attrFilter.values.map((v) => ({
							slug: v.id.toString(),
							name: v.value,
						}))}
						selectedOptions={selectedValueIds}
						onOptionChange={(valueIds: string[]) =>
							handleAttributeFilterChange(attrFilter.attributeId)(valueIds)
						}
						variant="filterMobile"
						noWrap
						multiSelect
						showAllOption={false}
						className={pillSectionClass}
					/>
				</div>,
			);
		});

		return <div className="flex flex-col gap-5">{sections}</div>;
	};

	// Sidebar: reset button in a CSS Grid expander (0fr ↔ 1fr). Pure CSS transition, no JS animation.
	if (variant === "sidebar") {
		return (
			<div className="flex flex-col gap-4">
				<div
					className="reset-filters-expander"
					data-expanded={hasAnyActiveFilters}
					aria-hidden={!hasAnyActiveFilters}
				>
					<div className="reset-filters-expander-inner">
						<Button
							type="button"
							variant="accent"
							size="sm"
							onClick={resetAll}
							className="w-full"
							tabIndex={hasAnyActiveFilters ? 0 : -1}
							aria-hidden={!hasAnyActiveFilters}
						>
							Сбросить фильтры
						</Button>
					</div>
				</div>
				{renderFilterContent()}
			</div>
		);
	}

	// Drawer: floating button + drawer (mobile)
	return (
		<>
			<Button
				size="sm"
				onClick={() => {
					setIsDrawerOpen(true);
					onFiltersOpen?.();
				}}
				onMouseEnter={handleFiltersButtonHover}
				className="fixed bottom-22 left-2 z-100 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-primary-foreground text-xs shadow-md lg:hidden"
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

			<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<DrawerContent width="full" className="border-primary">
					<DrawerBody className="w-full">
						<div className="space-y-4">{renderFilterContentMobile()}</div>
					</DrawerBody>

					<DrawerFooter className="border-border border-t bg-background px-4 sm:px-6 lg:px-8">
						<div className="flex w-full items-center justify-between">
							<div
								className="reset-filters-drawer-grid relative min-h-8"
								data-expanded={hasAnyActiveFilters}
							>
								<div
									className="reset-filters-drawer-row"
									aria-hidden={!hasAnyActiveFilters}
								>
									<Button
										type="button"
										variant="accent"
										size="sm"
										onClick={resetAll}
										tabIndex={hasAnyActiveFilters ? 0 : -1}
										aria-hidden={!hasAnyActiveFilters}
									>
										Сбросить все фильтры
									</Button>
								</div>
								<div
									className="reset-filters-drawer-row"
									aria-hidden={hasAnyActiveFilters}
								>
									<span className="block font-semibold text-lg leading-none tracking-tight">
										Фильтры
									</span>
								</div>
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
