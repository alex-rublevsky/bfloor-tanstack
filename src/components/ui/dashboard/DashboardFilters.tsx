/**
 * Dashboard filters component
 * Desktop: Horizontal row of Select dropdowns (sticky above table)
 * Mobile: Drawer with checkboxes (same as storefront)
 */

import { memo, useState } from "react";
import { useDeviceType } from "~/hooks/use-mobile";
import type { AttributeFilter } from "~/server_functions/store/getAttributeValuesForFiltering";
import { Button } from "../shared/Button";
import { Drawer, DrawerContent, DrawerTrigger } from "../shared/Drawer";
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

				{/* Store Location Select */}
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

				{/* Attribute Filters */}
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
			</div>
		);
	}

	// Mobile: Drawer with checkboxes (same as storefront)
	return (
		<div className="bg-background px-4 py-3">
			<Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpen}>
				<DrawerTrigger asChild>
					<Button variant="outline" className="w-full">
						<Icon name="menu" className="mr-2 h-4 w-4" />
						Filters
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<div className="max-h-[80vh] overflow-y-auto p-4">
						<h2 className="mb-4 font-semibold text-lg">Filters</h2>

						{/* Category Filter */}
						{categories.length > 0 && (
							<div className="mb-6">
								<h3 className="mb-2 font-medium text-sm">Категория</h3>
								<div className="space-y-2">
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="category"
											checked={!selectedCategory}
											onChange={() => onCategoryChange?.(null)}
											className="h-4 w-4"
										/>
										<span className="text-sm">Категории</span>
									</label>
									{categories.map((c) => (
										<label
											key={c.slug}
											className="flex items-center justify-between gap-2"
										>
											<div className="flex items-center gap-2">
												<input
													type="radio"
													name="category"
													checked={selectedCategory === c.slug}
													onChange={() => onCategoryChange?.(c.slug)}
													className="h-4 w-4"
												/>
												<span className="text-sm">{c.name}</span>
											</div>
											{c.count !== undefined && (
												<span className="text-muted-foreground text-xs">
													{c.count}
												</span>
											)}
										</label>
									))}
								</div>
							</div>
						)}

						{/* Brand Filter */}
						{brands.length > 0 && (
							<div className="mb-6">
								<h3 className="mb-2 font-medium text-sm">Бренд</h3>
								<div className="space-y-2">
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="brand"
											checked={!selectedBrand}
											onChange={() => onBrandChange?.(null)}
											className="h-4 w-4"
										/>
										<span className="text-sm">Бренды</span>
									</label>
									{brands.map((b) => (
										<label key={b.slug} className="flex items-center gap-2">
											<input
												type="radio"
												name="brand"
												checked={selectedBrand === b.slug}
												onChange={() => onBrandChange?.(b.slug)}
												className="h-4 w-4"
											/>
											<span className="text-sm">{b.name}</span>
										</label>
									))}
								</div>
							</div>
						)}

						{/* Collection Filter */}
						{collections.length > 0 && (
							<div className="mb-6">
								<h3 className="mb-2 font-medium text-sm">Коллекция</h3>
								<div className="space-y-2">
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="collection"
											checked={!selectedCollection}
											onChange={() => onCollectionChange?.(null)}
											className="h-4 w-4"
										/>
										<span className="text-sm">Коллекции</span>
									</label>
									{collections.map((c) => (
										<label key={c.slug} className="flex items-center gap-2">
											<input
												type="radio"
												name="collection"
												checked={selectedCollection === c.slug}
												onChange={() => onCollectionChange?.(c.slug)}
												className="h-4 w-4"
											/>
											<span className="text-sm">{c.name}</span>
										</label>
									))}
								</div>
							</div>
						)}

						{/* Store Location Filter */}
						{storeLocations.length > 0 && (
							<div className="mb-6">
								<h3 className="mb-2 font-medium text-sm">Магазин</h3>
								<div className="space-y-2">
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="location"
											checked={!selectedStoreLocation}
											onChange={() => onStoreLocationChange?.(null)}
											className="h-4 w-4"
										/>
										<span className="text-sm">Магазины</span>
									</label>
									{storeLocations.map((loc) => (
										<label key={loc.id} className="flex items-center gap-2">
											<input
												type="radio"
												name="location"
												checked={selectedStoreLocation === loc.id}
												onChange={() => onStoreLocationChange?.(loc.id)}
												className="h-4 w-4"
											/>
											<span className="text-sm">{loc.address}</span>
										</label>
									))}
								</div>
							</div>
						)}

						{/* Attribute Filters */}
						{attributeFilters.map((attr) => {
							const selectedValues =
								selectedAttributeFilters?.[attr.attributeId] ?? [];
							return (
								<div key={attr.attributeId} className="mb-6">
									<h3 className="mb-2 font-medium text-sm">
										{attr.attributeName}
									</h3>
									<div className="space-y-2">
										{attr.values.map((v: { id: number; value: string }) => {
											const isSelected = selectedValues.includes(
												v.id.toString(),
											);
											return (
												<label key={v.id} className="flex items-center gap-2">
													<input
														type="checkbox"
														checked={isSelected}
														onChange={(e) => {
															const newValues = e.target.checked
																? [...selectedValues, v.id.toString()]
																: selectedValues.filter(
																		(id) => id !== v.id.toString(),
																	);
															onAttributeFilterChange?.(
																attr.attributeId,
																newValues,
															);
														}}
														className="h-4 w-4"
													/>
													<span className="text-sm">{v.value}</span>
												</label>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</DrawerContent>
			</Drawer>
		</div>
	);
});

export default DashboardFilters;
