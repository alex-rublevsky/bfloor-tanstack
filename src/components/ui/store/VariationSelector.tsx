import { useMemo } from "react";
import {
	getAttributeDisplayName,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
import type { ProductWithVariations, VariationAttribute } from "~/types";
import { sortVariationsForDisplay } from "~/utils/variationSort";

interface VariationSelectorProps {
	product: ProductWithVariations;
	selectedAttributes: Record<string, string> | null;
	search: Record<string, string | undefined>;
	onAttributeChange: (attributeId: string, value: string) => void;
}

export function VariationSelector({
	product,
	selectedAttributes,
	onAttributeChange,
}: VariationSelectorProps) {
	const { data: attributes } = useProductAttributes();

	// Get all unique attributes for this product (respect variation sort order)
	// Memoized to avoid recalculating on every render
	const productAttributes = useMemo(() => {
		if (!product.variations || product.variations.length === 0) return [];

		const sortedVariations = sortVariationsForDisplay(product.variations);

		const attributeMap = new Map<
			string,
			{ values: string[]; seen: Set<string> }
		>();

		sortedVariations.forEach((variation) => {
			variation.attributes.forEach((attr: VariationAttribute) => {
				if (!attributeMap.has(attr.attributeId)) {
					attributeMap.set(attr.attributeId, { values: [], seen: new Set() });
				}
				const entry = attributeMap.get(attr.attributeId);
				if (entry && !entry.seen.has(attr.value)) {
					entry.seen.add(attr.value);
					entry.values.push(attr.value);
				}
			});
		});

		return Array.from(attributeMap.entries()).map(([attributeId, entry]) => ({
			attributeId,
			displayName: getAttributeDisplayName(attributeId, attributes || []),
			values: entry.values,
		}));
	}, [product.variations, attributes]);

	// Directly use onAttributeChange - no need for wrapper callback

	if (productAttributes.length === 0) {
		return null;
	}

	return (
		<>
			{productAttributes.map(({ attributeId, displayName, values }) => (
				<div key={attributeId} className="space-y-2">
					<div className="font-medium text-gray-700 text-sm">{displayName}</div>
					<div className="flex flex-wrap gap-2">
						{values.map((value) => {
							const isSelected = selectedAttributes?.[attributeId] === value;
							return (
								<button
									key={value}
									type="button"
									onClick={() => onAttributeChange(attributeId, value)}
									className={`rounded-md border px-3 py-2 text-sm transition-colors ${
										isSelected
											? "border-red-600 bg-red-600 text-white"
											: "border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50"
									}`}
								>
									{value}
								</button>
							);
						})}
					</div>
				</div>
			))}
		</>
	);
}
