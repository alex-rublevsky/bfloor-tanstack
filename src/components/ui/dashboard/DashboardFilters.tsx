/**
 * Dashboard filters component
 * Desktop: Horizontal row of Select dropdowns (sticky above table)
 * Mobile: Drawer with horizontal pill buttons (same style as storefront)
 */

import { memo, useState } from "react";
import { useDeviceType } from "~/hooks/use-mobile";
import type { AttributeFilter } from "~/server_functions/store/getAttributeValuesForFiltering";
import { Button } from "../shared/Button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerFooter,
	DrawerTrigger,
} from "../shared/Drawer";
import { FilterGroup } from "../shared/FilterGroup";
import { Icon } from "../shared/Icon";
import { Select } from "../shared/Select";

interface DashboardFiltersProps {
	categories?: { slug: string; name: string; count?: number }[];
	selectedCategory?: string | null;
	onCategoryChange?: (category: string | null) => void;
	brands?: { slug: string; name: string }[];
	selectedBrand?: string | null;
	onBrandChange?: (brand: string | null) => void;
	collections?: { slug: string; name: string }[];
	selectedCollection?: string | null;
	onCollectionChange?: (collection: string | null) => void;
	storeLocations?: { id: number; address: string }[];
	selectedStoreLocation?: number | null;
	onStoreLocationChange?: (locationId: number | null) => void;
	attributeFilters?: AttributeFilter[];
	selectedAttributeFilters?: Record<number, string[]>;
	onAttributeFilterChange?: (attributeId: number, valueIds: string[]) => void;
	onFiltersOpen?: () => void;
}

const DashboardFilters = memo(function DashboardFilters({
	categories = [],
	selectedCategory = null,
	onCategoryChange,
	brands = [],
	selectedBrand = null,
	onBrandChange,
	collections = [],
	selectedCollection = null,
	onCollectionChange,
	storeLocations = [],
	selectedStoreLocation = null,
	onStoreLocationChange,
	attributeFilters = [],
	selectedAttributeFilters = {},
	onAttributeFilterChange,
	onFiltersOpen,
}: DashboardFiltersProps) {
	const { isMobileOrTablet } = useDeviceType();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	// Handle drawer open
	const handleDrawerOpen = (open: boolean) => {
		setIsDrawerOpen(open);
		if (open) {
			onFiltersOpen?.();
		}
	};

	// Desktop: Horizontal row of selects
	if (!isMobileOrTablet) {
		return (
			<div className="flex flex-wrap items-center gap-3 overflow-visible bg-background px-4 py-3">
				{/* Order: Category, Brand, Collection, attribute filters, Store location */}
				{/* Category Select */}
				{categories.length > 0 && (
					<Select
						size="sm"
						value={selectedCategory ?? ""}
						onValueChange={(value) => onCategoryChange?.(value || null)}
						options={[
							{ value: "", label: "Категории" },
							...categories.map((c) => ({
								value: c.slug,
								label: c.count ? `${c.name} (${c.count})` : c.name,
							})),
						]}
						className="field-sizing-content"
					/>
				)}

				{/* Brand Select */}
				{brands.length > 0 && (
					<Select
						size="sm"
						value={selectedBrand ?? ""}
						onValueChange={(value) => onBrandChange?.(value || null)}
						options={[
							{ value: "", label: "Бренды" },
							...brands.map((b) => ({ value: b.slug, label: b.name })),
						]}
						className="field-sizing-content"
					/>
				)}

				{/* Collection Select */}
				{collections.length > 0 && (
					<Select
						size="sm"
						value={selectedCollection ?? ""}
						onValueChange={(value) => onCollectionChange?.(value || null)}
						options={[
							{ value: "", label: "Коллекции" },
							...collections.map((c) => ({ value: c.slug, label: c.name })),
						]}
						className="field-sizing-content"
					/>
				)}

				{/* Attribute Filters (order from API = ATTRIBUTE_FILTER_DISPLAY_ORDER) */}
				{attributeFilters.map((attr) => {
					const selectedValues =
						selectedAttributeFilters?.[attr.attributeId] ?? [];
					// For single-select, use Select component
					return (
						<Select
							key={attr.attributeId}
							size="sm"
							value={selectedValues[0] ?? ""}
							onValueChange={(value) => {
								onAttributeFilterChange?.(
									attr.attributeId,
									value ? [value] : [],
								);
							}}
							options={[
								{ value: "", label: attr.attributeName },
								...attr.values.map((v: { id: number; value: string }) => ({
									value: v.id.toString(),
									label: v.value,
								})),
							]}
							className="field-sizing-content"
						/>
					);
				})}

				{/* Store Location Select – last in default order */}
				{storeLocations.length > 0 && (
					<Select
						size="sm"
						value={selectedStoreLocation?.toString() ?? ""}
						onValueChange={(value) =>
							onStoreLocationChange?.(value ? Number(value) : null)
						}
						options={[
							{ value: "", label: "Магазины" },
							...storeLocations.map((loc) => ({
								value: loc.id.toString(),
								label: loc.address,
							})),
						]}
						className="field-sizing-content"
					/>
				)}
			</div>
		);
	}

	// Check if any filters are active
	const hasAnyActiveFilters =
		selectedCategory !== null ||
		selectedBrand !== null ||
		selectedCollection !== null ||
		selectedStoreLocation !== null ||
		Object.keys(selectedAttributeFilters ?? {}).some(
			(key) => (selectedAttributeFilters?.[Number(key)] ?? []).length > 0,
		);

	// Reset all filters
	const resetAllFilters = () => {
		onCategoryChange?.(null);
		onBrandChange?.(null);
		onCollectionChange?.(null);
		onStoreLocationChange?.(null);
		// Reset all attribute filters
		if (onAttributeFilterChange) {
			for (const attr of attributeFilters) {
				onAttributeFilterChange(attr.attributeId, []);
			}
		}
	};

	// Render mobile filter content with horizontal pill buttons
	const renderMobileFilterContent = () => {
		const pillSectionClass =
			"min-w-0 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1";
		const sections = [];

		// Categories – horizontal pills
		if (categories.length > 0) {
			sections.push(
				<div key="categories" className="min-w-0">
					<FilterGroup
						title="Категория"
						options={categories.map((c) => ({
							slug: c.slug,
							name: c.count !== undefined ? `${c.name} (${c.count})` : c.name,
						}))}
						selectedOptions={selectedCategory}
						onOptionChange={(slug: string | null) => onCategoryChange?.(slug)}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		// Brands – horizontal pills
		if (brands.length > 0) {
			sections.push(
				<div key="brands" className="min-w-0">
					<FilterGroup
						title="Бренд"
						options={brands.map((b) => ({ slug: b.slug, name: b.name }))}
						selectedOptions={selectedBrand}
						onOptionChange={(slug: string | null) => onBrandChange?.(slug)}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		// Collections – horizontal pills
		if (collections.length > 0) {
			sections.push(
				<div key="collections" className="min-w-0">
					<FilterGroup
						title="Коллекция"
						options={collections.map((c) => ({ slug: c.slug, name: c.name }))}
						selectedOptions={selectedCollection}
						onOptionChange={(slug: string | null) => onCollectionChange?.(slug)}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		// Attribute filters – horizontal pills, multi-select
		attributeFilters.forEach((attr) => {
			if (attr.values.length === 0) return;
			const selectedValueIds =
				selectedAttributeFilters?.[attr.attributeId] ?? [];
			sections.push(
				<div key={`attr-${attr.attributeId}`} className="min-w-0">
					<FilterGroup
						title={attr.attributeName}
						options={attr.values.map((v) => ({
							slug: v.id.toString(),
							name: v.value,
						}))}
						selectedOptions={selectedValueIds}
						onOptionChange={(valueIds: string[]) =>
							onAttributeFilterChange?.(attr.attributeId, valueIds)
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

		// Store locations – horizontal pills (last in default order)
		if (storeLocations.length > 0) {
			sections.push(
				<div key="store-locations" className="min-w-0">
					<FilterGroup
						title="Магазин"
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
							onStoreLocationChange?.(slug ? Number(slug) : null)
						}
						variant="filterMobile"
						noWrap
						className={pillSectionClass}
					/>
				</div>,
			);
		}

		return <div className="flex flex-col gap-5">{sections}</div>;
	};

	// Mobile: Drawer with horizontal pill buttons (same style as storefront)
	return (
		<div className="bg-background px-4 py-3">
			<Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpen}>
				<DrawerTrigger asChild>
					<Button variant="outline" className="w-full">
						<Icon name="menu" className="mr-2 h-4 w-4" />
						Фильтры
					</Button>
				</DrawerTrigger>
				<DrawerContent width="full" className="border-primary">
					<DrawerBody className="w-full">
						<div className="space-y-4">{renderMobileFilterContent()}</div>
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
										onClick={resetAllFilters}
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
		</div>
	);
});

export default DashboardFilters;
