import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
	ProductAttribute,
	ProductVariationWithAttributes,
	ProductWithVariations,
	VariationAttribute,
} from "~/types";
import { sortVariationsForDisplay } from "~/utils/variationSort";

interface UseVariationSelectionProps {
	product: ProductWithVariations | null;
	search?: Record<string, string | undefined>; // If provided, uses URL state
	onVariationChange?: () => void;
	attributes?: ProductAttribute[]; // Database attributes for slug conversion
}

interface UseVariationSelectionReturn {
	selectedVariation: ProductVariationWithAttributes | null;
	selectedAttributes: Record<string, string>;
	selectVariation: (attributeId: string, value: string) => void;
}

const collectAttributeIds = (variations: ProductVariationWithAttributes[]) => {
	const attributeIds = new Set<string>();
	variations.forEach((variation) => {
		variation.attributes.forEach((attr: VariationAttribute) => {
			attributeIds.add(attr.attributeId);
		});
	});
	return attributeIds;
};

const buildDefaultAttributes = (
	variations: ProductVariationWithAttributes[],
	allAttributeIds: Set<string>,
) => {
	const defaults: Record<string, string> = {};
	if (!variations.length || allAttributeIds.size === 0) return defaults;

	const completeVariation = variations.find((variation) =>
		Array.from(allAttributeIds).every((attrId) =>
			variation.attributes.some(
				(attr: VariationAttribute) => attr.attributeId === attrId,
			),
		),
	);

	const baseVariation = completeVariation || variations[0];
	baseVariation?.attributes.forEach((attr: VariationAttribute) => {
		defaults[attr.attributeId] = attr.value;
	});

	if (Object.keys(defaults).length < allAttributeIds.size) {
		for (const variation of variations) {
			for (const attr of variation.attributes) {
				if (!defaults[attr.attributeId]) {
					defaults[attr.attributeId] = attr.value;
				}
			}
		}
	}

	return defaults;
};

export function useVariationSelection({
	product,
	search,
	onVariationChange,
	attributes = [],
}: UseVariationSelectionProps): UseVariationSelectionReturn {
	const navigate = useNavigate();
	const useUrlState = search !== undefined;

	// Local state for product cards
	const [localSelectedAttributes, setLocalSelectedAttributes] = useState<
		Record<string, string>
	>({});

	// Create lookup maps for efficient attribute resolution
	const attributeSlugToIdMap = useMemo(() => {
		const map = new Map<string, string>();
		(
			attributes as Array<ProductAttribute & { id: number; slug: string }>
		).forEach((attr) => {
			map.set(attr.slug, attr.id.toString());
			map.set(attr.id.toString(), attr.id.toString()); // Also support numeric ID
		});
		return map;
	}, [attributes]);

	const attributeIdToSlugMap = useMemo(() => {
		const map = new Map<string, string>();
		(
			attributes as Array<ProductAttribute & { id: number; slug: string }>
		).forEach((attr) => {
			map.set(attr.id.toString(), attr.slug);
		});
		return map;
	}, [attributes]);

	const attributeIdsInVariations = useMemo(() => {
		if (!product?.variations) return new Set<string>();
		const ids = new Set<string>();
		product.variations.forEach((variation) => {
			variation.attributes.forEach((attr: VariationAttribute) => {
				ids.add(attr.attributeId);
			});
		});
		return ids;
	}, [product?.variations]);

	// Convert URL search params to attributes (for product page)
	const urlSelectedAttributes = useMemo(() => {
		if (!useUrlState || !search) return {};

		const attributesMap: Record<string, string> = {};
		Object.entries(search).forEach(([paramName, value]) => {
			if (!value) return;

			// Use lookup map instead of find (O(1) instead of O(n))
			const attributeId = attributeSlugToIdMap.get(paramName);
			if (attributeId && attributeIdsInVariations.has(attributeId)) {
				attributesMap[attributeId] = value;
			}
		});

		return attributesMap;
	}, [useUrlState, search, attributeSlugToIdMap, attributeIdsInVariations]);

	// Get current selected attributes based on mode
	const selectedAttributes = useUrlState
		? urlSelectedAttributes
		: localSelectedAttributes;

	const sortedVariations = useMemo(
		() => sortVariationsForDisplay(product?.variations ?? []),
		[product?.variations],
	);

	// Get all unique attribute IDs
	const allAttributeIds = useMemo(
		() => collectAttributeIds(sortedVariations),
		[sortedVariations],
	);

	const defaultAttributes = useMemo(
		() => buildDefaultAttributes(sortedVariations, allAttributeIds),
		[sortedVariations, allAttributeIds],
	);

	// Create a lookup map for variations by their attribute combination (key: "attrId1:value1|attrId2:value2")
	// This avoids O(n*m*k) complexity when finding variations
	const variationLookupMap = useMemo(() => {
		if (!product?.variations)
			return new Map<string, ProductVariationWithAttributes>();

		const map = new Map<string, ProductVariationWithAttributes>();
		product.variations.forEach((variation) => {
			// Create a sorted key from all attributes
			const key = variation.attributes
				.map((attr: VariationAttribute) => `${attr.attributeId}:${attr.value}`)
				.sort()
				.join("|");
			map.set(key, variation);
		});
		return map;
	}, [product?.variations]);

	// Helper to create lookup key from selected attributes
	const createLookupKey = useCallback(
		(attributes: Record<string, string>): string => {
			return Array.from(allAttributeIds)
				.map((attrId) => `${attrId}:${attributes[attrId] || ""}`)
				.sort()
				.join("|");
		},
		[allAttributeIds],
	);

	// Auto-select defaults for product cards (local state mode)
	useEffect(() => {
		// Skip if using URL state or no variations
		if (useUrlState || !product?.variations?.length || !sortedVariations.length)
			return;

		// Skip if already has selections or no defaults
		if (Object.keys(localSelectedAttributes).length > 0) return;
		if (Object.keys(defaultAttributes).length === 0) return;

		setLocalSelectedAttributes(defaultAttributes);
	}, [
		useUrlState,
		product?.variations?.length,
		sortedVariations.length,
		localSelectedAttributes,
		defaultAttributes,
	]);

	// Auto-select missing defaults for product page (URL state mode)
	useEffect(() => {
		if (
			!useUrlState ||
			!product?.variations?.length ||
			!sortedVariations.length
		)
			return;

		const requiredIds = Array.from(allAttributeIds);
		if (requiredIds.length === 0) return;

		const missingIds = requiredIds.filter(
			(attrId) => !urlSelectedAttributes[attrId],
		);
		if (missingIds.length === 0) return;

		const urlParams: Record<string, string | undefined> = {
			...(search || {}),
		};

		let didAdd = false;
		for (const attrId of missingIds) {
			const value = defaultAttributes[attrId];
			if (!value) continue;
			// Use lookup map instead of find (O(1) instead of O(n))
			const slug = attributeIdToSlugMap.get(attrId) || attrId;
			if (!urlParams[slug]) {
				urlParams[slug] = value;
				didAdd = true;
			}
		}

		if (!didAdd) return;

		navigate({
			search: urlParams as unknown as Parameters<typeof navigate>[0]["search"],
			replace: true,
		});
	}, [
		useUrlState,
		product?.variations?.length,
		sortedVariations.length,
		allAttributeIds,
		urlSelectedAttributes,
		defaultAttributes,
		attributeIdToSlugMap,
		navigate,
		search,
	]);

	// Find selected variation using lookup map (O(1) instead of O(n*m*k))
	const selectedVariation = useMemo(() => {
		if (
			!product?.variations?.length ||
			Object.keys(selectedAttributes).length === 0
		) {
			return null;
		}

		const hasAllRequiredAttributes = Array.from(allAttributeIds).every(
			(attrId) => selectedAttributes[attrId],
		);

		if (!hasAllRequiredAttributes) return null;

		const key = createLookupKey(selectedAttributes);
		return variationLookupMap.get(key) || null;
	}, [
		product,
		selectedAttributes,
		allAttributeIds,
		variationLookupMap,
		createLookupKey,
	]);

	// Reuse the attributeIdToSlugMap created above

	// Select variation - handles both URL and local state
	const selectVariation = useCallback(
		(attributeId: string, value: string) => {
			if (!product?.variations) return;

			// Find matching variation using lookup map (O(1) instead of O(n*m*k))
			const desiredAttributes = { ...selectedAttributes, [attributeId]: value };
			const key = createLookupKey(desiredAttributes);
			const targetVariation = variationLookupMap.get(key);

			if (!targetVariation) {
				// No exact match found, do nothing
				return;
			}

			// Update state with the selected variation
			const newAttributes: Record<string, string> = {};
			targetVariation.attributes.forEach((attr: VariationAttribute) => {
				newAttributes[attr.attributeId] = attr.value;
			});

			if (useUrlState) {
				// Update URL state - use slugs for URL parameters
				const urlParams: Record<string, string | undefined> = {};

				targetVariation.attributes.forEach((attr: VariationAttribute) => {
					// Use lookup map instead of find (O(1) instead of O(n))
					const slug =
						attributeIdToSlugMap.get(attr.attributeId) || attr.attributeId;
					urlParams[slug] = attr.value;
				});

				navigate({
					search: urlParams as unknown as Parameters<
						typeof navigate
					>[0]["search"],
					replace: true,
				});
			} else {
				// Update local state
				setLocalSelectedAttributes(newAttributes);
			}

			onVariationChange?.();
		},
		[
			product?.variations,
			selectedAttributes,
			useUrlState,
			navigate,
			onVariationChange,
			variationLookupMap,
			createLookupKey,
			attributeIdToSlugMap,
		],
	);

	return {
		selectedVariation,
		selectedAttributes,
		selectVariation,
	};
}
