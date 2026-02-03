import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
	generateVariationSKU,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
import { generateSlug, useSlugGeneration } from "~/hooks/useSlugGeneration";
import type { ProductFormData } from "~/types";

export interface Variation {
	id: string;
	sku: string;
	price: number;
	discount?: number | null;
	sort: number;
	attributeValues: Record<string, string>;
}

const defaultFormData: ProductFormData = {
	name: "",
	slug: "",
	sku: "",
	description: "",
	importantNote: "",
	tags: [],
	price: "0",
	squareMetersPerPack: "",
	unitOfMeasurement: "штука",
	categorySlug: "",
	brandSlug: "",
	collectionSlug: "",
	isActive: true,
	isFeatured: false,
	discount: null,
	hasVariations: false,
	images: "",
	attributes: [],
	variations: [],
	dimensions: "",
};

interface UseProductFormOptions {
	initialFormData?: ProductFormData;
	initialIsAutoSlug?: boolean;
	initialVariations?: Variation[];
	initialSelectedVariationAttributes?: string[];
	initialSelectedStoreLocationIds?: number[];
	onSubmit: (
		data: ProductFormData & { storeLocationIds: number[] },
	) => Promise<void>;
	onSuccess?: () => void;
	onImagesChange?: (images: string, deletedImages?: string[]) => void;
	/**
	 * Custom validation function. If provided, this will be used instead of default validation.
	 * Return true if valid, false if invalid.
	 */
	validate?: (formData: ProductFormData) => boolean;
}

export function useProductForm({
	initialFormData = defaultFormData,
	initialIsAutoSlug = true,
	initialVariations = [],
	initialSelectedVariationAttributes = [],
	initialSelectedStoreLocationIds = [],
	onSubmit,
	onSuccess,
	onImagesChange,
	validate,
}: UseProductFormOptions) {
	const queryClient = useQueryClient();
	const { data: attributes } = useProductAttributes();

	const [formData, setFormData] = useState<ProductFormData>(initialFormData);
	const [error, setError] = useState("");
	const [isAutoSlug, setIsAutoSlug] = useState(initialIsAutoSlug);
	const [variations, setVariations] = useState<Variation[]>(initialVariations);
	const [selectedVariationAttributes, setSelectedVariationAttributes] =
		useState<string[]>(initialSelectedVariationAttributes);
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const [selectedStoreLocationIds, setSelectedStoreLocationIds] = useState<
		number[]
	>(initialSelectedStoreLocationIds);
	const [deletedImages, setDeletedImages] = useState<string[]>([]);

	// Stable callbacks for slug generation
	const handleSlugChange = useCallback(
		(slug: string) => setFormData((prev) => ({ ...prev, slug })),
		[],
	);

	// Auto-slug generation
	useSlugGeneration(formData.name, isAutoSlug, handleSlugChange);

	// Helper function to format variations (extracted to avoid duplication)
	const formatVariations = useCallback((variationsToFormat: Variation[]) => {
		return variationsToFormat.map((v) => ({
			id: v.id.startsWith("temp-") ? undefined : parseInt(v.id, 10),
			sku: v.sku,
			price: v.price.toString(),
			discount: v.discount ?? null,
			sort: v.sort,
			attributes: Object.entries(v.attributeValues).map(
				([attributeId, value]) => ({
					attributeId,
					value,
				}),
			),
		}));
	}, []);

	// Sync variations to form data
	useEffect(() => {
		setFormData((prev) => ({
			...prev,
			variations: formatVariations(variations),
		}));
	}, [variations, formatVariations]);

	const handleImagesChange = useCallback(
		(images: string, deletedImagesList?: string[]) => {
			setFormData((prev) => ({ ...prev, images }));
			if (deletedImagesList) {
				setDeletedImages(deletedImagesList);
			}
			onImagesChange?.(images, deletedImagesList);
		},
		[onImagesChange],
	);

	const handleStoreLocationChange = useCallback(
		(locationId: number, checked: boolean) => {
			setSelectedStoreLocationIds((prev) => {
				if (checked) {
					return [...prev, locationId];
				} else {
					return prev.filter((id) => id !== locationId);
				}
			});
		},
		[],
	);

	const handleVariationsChange = useCallback((newVariations: Variation[]) => {
		setVariations(newVariations);
	}, []);

	const handleChange = useCallback(
		(
			e: React.ChangeEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>,
		) => {
			const { name, value, type } = e.target;
			const checked = (e.target as HTMLInputElement).checked;

			if (name === "slug") {
				setIsAutoSlug(false);
			}

			setFormData((prev) => {
				let updatedFormData: ProductFormData = { ...prev };

				if (name === "discount") {
					updatedFormData = {
						...updatedFormData,
						discount: value === "" ? null : parseInt(value, 10) || null,
					};
				} else {
					updatedFormData = {
						...updatedFormData,
						[name]: type === "checkbox" ? checked : value,
					};
				}

				// Handle hasVariations toggle
				if (name === "hasVariations" && checked && variations.length === 0) {
					const defaultVariation: Variation = {
						id: `temp-${Date.now()}`,
						sku: generateVariationSKU(
							updatedFormData.slug,
							[],
							attributes || [],
						),
						price: updatedFormData.price
							? parseFloat(updatedFormData.price)
							: 0,
						sort: 0,
						attributeValues: {},
					};
					setVariations([defaultVariation]);
				}

				return updatedFormData;
			});
		},
		[variations, attributes],
	);

	const handleEntityCreated = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["bfloorBrands"] });
		queryClient.invalidateQueries({ queryKey: ["bfloorCollections"] });
		queryClient.invalidateQueries({ queryKey: ["bfloorCategories"] });
	}, [queryClient]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setHasAttemptedSubmit(true);

		// Validate required fields
		if (validate) {
			if (!validate(formData)) {
				return;
			}
		} else {
			// Default validation for create (requires categorySlug)
			if (
				!formData.name ||
				!formData.slug ||
				!formData.price ||
				!formData.categorySlug
			) {
				return;
			}
		}

		setError("");

		try {
			const submissionData = {
				...formData,
				variations: formData.variations,
				storeLocationIds: selectedStoreLocationIds,
			};

			await onSubmit(submissionData);
			onSuccess?.();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			setError(errorMessage);
			throw err; // Re-throw so caller can handle toast, etc.
		}
	};

	const handleAutoSlugChange = useCallback(
		(isAuto: boolean) => {
			setIsAutoSlug(isAuto);
			if (isAuto && formData.name) {
				const generated = generateSlug(formData.name);
				setFormData((prev) => ({ ...prev, slug: generated }));
			}
		},
		[formData.name],
	);

	const handleSlugManualChange = useCallback((slug: string) => {
		setIsAutoSlug(false);
		setFormData((prev) => ({ ...prev, slug }));
	}, []);

	return {
		formData,
		setFormData,
		error,
		isAutoSlug,
		variations,
		selectedVariationAttributes,
		setSelectedVariationAttributes,
		hasAttemptedSubmit,
		selectedStoreLocationIds,
		setSelectedStoreLocationIds,
		deletedImages,
		handleChange,
		handleImagesChange,
		handleStoreLocationChange,
		handleVariationsChange,
		handleEntityCreated,
		handleSubmit,
		handleAutoSlugChange,
		handleSlugManualChange,
		setVariations,
		setIsAutoSlug,
	};
}
