import { useMemo } from "react";
import { X } from "~/components/ui/shared/Icon";
import type { Collection } from "~/types";

interface AttributeFilter {
	attributeId: number;
	attributeName: string;
	values: Array<{ id: number; value: string; slug: string | null }>;
}

interface ActiveFiltersDisplayProps {
	categoryName: string | null; // Category name from route params or null for main store/brand page
	brandName?: string | null; // Brand name when this is a brand page (for title)
	brands: Array<{ slug: string; name: string }>; // Brand or minimal { slug, name } for brand page
	selectedBrand: string | null;
	collections: Collection[];
	selectedCollection: string | null;
	storeLocations?: Array<{ id: number; address: string }>;
	selectedStoreLocation?: number | null;
	attributeFilters: AttributeFilter[];
	selectedAttributeFilters: Record<number, string[]>;
	onRemoveBrand: () => void;
	onRemoveCollection: () => void;
	onRemoveStoreLocation?: () => void;
	onRemoveAttributeValue: (attributeId: number, valueId: string) => void;
}

/**
 * Reusable component to display active filters as pills with remove buttons
 * Used on both store page and dashboard products page
 */
export function ActiveFiltersDisplay({
	categoryName,
	brandName = null,
	brands,
	selectedBrand,
	collections,
	selectedCollection,
	storeLocations = [],
	selectedStoreLocation = null,
	attributeFilters,
	selectedAttributeFilters,
	onRemoveBrand,
	onRemoveCollection,
	onRemoveStoreLocation,
	onRemoveAttributeValue,
}: ActiveFiltersDisplayProps) {
	// Resolve brand name from brands (for filter pill); title uses brandName prop when on brand page
	const resolvedBrandName = useMemo(() => {
		if (!selectedBrand) return null;
		const b = brands.find((x) => x.slug === selectedBrand);
		return b?.name ?? null;
	}, [brands, selectedBrand]);

	// Get collection name
	const collectionName = useMemo(() => {
		if (!selectedCollection) return null;
		const collection = collections.find((c) => c.slug === selectedCollection);
		return collection?.name ?? null;
	}, [collections, selectedCollection]);

	// Get store location address
	const storeLocationAddress = useMemo(() => {
		if (selectedStoreLocation === null) return null;
		const location = storeLocations.find((l) => l.id === selectedStoreLocation);
		return location?.address ?? null;
	}, [storeLocations, selectedStoreLocation]);

	// Get attribute filter pills with IDs for removal
	const attributePills = useMemo(() => {
		const pills: Array<{
			attributeId: number;
			attributeName: string;
			values: Array<{ id: string; name: string }>;
		}> = [];

		for (const [attributeIdStr, valueIds] of Object.entries(
			selectedAttributeFilters,
		)) {
			const attributeId = parseInt(attributeIdStr, 10);
			if (Number.isNaN(attributeId) || valueIds.length === 0) continue;

			const attributeFilter = attributeFilters.find(
				(af) => af.attributeId === attributeId,
			);
			if (!attributeFilter) continue;

			const values = valueIds
				.map((valueId) => {
					const value = attributeFilter.values.find(
						(v) => v.id.toString() === valueId || v.slug === valueId,
					);
					return value ? { id: valueId, name: value.value } : null;
				})
				.filter((v): v is { id: string; name: string } => v !== null);

			if (values.length > 0) {
				pills.push({
					attributeId,
					attributeName: attributeFilter.attributeName,
					values,
				});
			}
		}

		return pills;
	}, [attributeFilters, selectedAttributeFilters]);

	// Show skeleton for title if category name is expected but not loaded yet
	const showTitleSkeleton = false; // Category name comes from route loader, so it's always available

	return (
		<div className="px-4 pt-6 pb-4">
			{/* Title */}
			{showTitleSkeleton ? (
				<div className="mb-3 h-10 w-48 animate-pulse rounded bg-muted md:h-12" />
			) : (
				<h1
					key={categoryName ?? brandName ?? "all"}
					className="mb-3 font-semibold text-2xl md:text-3xl"
					style={{
						animation: "fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
					}}
				>
					{brandName ?? categoryName ?? "Все товары"}
				</h1>
			)}

			{/* Filter Pills */}
			{(resolvedBrandName ||
				collectionName ||
				storeLocationAddress ||
				attributePills.length > 0) && (
				<div className="flex flex-wrap gap-2">
					{resolvedBrandName && (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground text-sm transition-all duration-200 hover:bg-muted/80">
							<span>{resolvedBrandName}</span>
							<button
								type="button"
								onClick={onRemoveBrand}
								className="h-4 w-4 rounded-full p-0 transition-standard hover:bg-background/50"
								aria-label={`Remove ${resolvedBrandName} filter`}
							>
								<X
									size={14}
									className="text-muted-foreground hover:text-foreground"
								/>
							</button>
						</span>
					)}
					{collectionName && (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground text-sm transition-all duration-200 hover:bg-muted/80">
							<span>{collectionName}</span>
							<button
								type="button"
								onClick={onRemoveCollection}
								className="h-4 w-4 rounded-full p-0 transition-standard hover:bg-background/50"
								aria-label={`Remove ${collectionName} filter`}
							>
								<X
									size={14}
									className="text-muted-foreground hover:text-foreground"
								/>
							</button>
						</span>
					)}
					{storeLocationAddress && onRemoveStoreLocation && (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground text-sm transition-all duration-200 hover:bg-muted/80">
							<span>{storeLocationAddress}</span>
							<button
								type="button"
								onClick={onRemoveStoreLocation}
								className="h-4 w-4 rounded-full p-0 transition-standard hover:bg-background/50"
								aria-label={`Remove ${storeLocationAddress} filter`}
							>
								<X
									size={14}
									className="text-muted-foreground hover:text-foreground"
								/>
							</button>
						</span>
					)}
					{attributePills.map((pill) =>
						pill.values.map((value) => (
							<span
								key={`${pill.attributeId}-${value.id}`}
								className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground text-sm transition-all duration-200 hover:bg-muted/80"
							>
								<span>{value.name}</span>
								<button
									type="button"
									onClick={() =>
										onRemoveAttributeValue(pill.attributeId, value.id)
									}
									className="h-4 w-4 rounded-full p-0 transition-standard hover:bg-background/50"
									aria-label={`Remove ${value.name} filter`}
								>
									<X
										size={14}
										className="text-muted-foreground hover:text-foreground"
									/>
								</button>
							</span>
						)),
					)}
				</div>
			)}
		</div>
	);
}
