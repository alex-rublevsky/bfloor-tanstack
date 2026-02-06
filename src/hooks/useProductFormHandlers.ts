import { useCallback } from "react";
import type { ProductFormData } from "~/types";

/**
 * Shared handlers for product forms (create & edit)
 * Extracted to avoid duplication between pages
 */
export function useProductFormHandlers(
	setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>,
) {
	const handleTagsChange = useCallback(
		(itemId: string, checked: boolean) => {
			setFormData((prev) => {
				const currentTags = prev.tags || [];
				return {
					...prev,
					tags: checked
						? [...currentTags, itemId]
						: currentTags.filter((t) => t !== itemId),
				};
			});
		},
		[setFormData],
	);

	const handleAttributesChange = useCallback(
		(attributes: ProductFormData["attributes"]) => {
			setFormData((prev) => ({ ...prev, attributes }));
		},
		[setFormData],
	);

	return {
		handleTagsChange,
		handleAttributesChange,
	};
}
