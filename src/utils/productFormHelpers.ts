import type { Variation } from "~/hooks/useProductForm";
import { generateSlug } from "~/hooks/useSlugGeneration";
import type {
	ProductAttributeFormData,
	ProductFormData,
	ProductVariationWithAttributes,
	ProductWithVariations,
	VariationAttribute,
} from "~/types";

/** Variation shape accepted by transformer (dashboard API uses id: string, no productId) */
type TransformVariationInput = {
	id: string | number;
	sku: string;
	price: number;
	discount?: number | null;
	sort?: number | null;
	attributes?: VariationAttribute[];
};

/** Input type: ProductWithVariations with optional viewCount and flexible productAttributes/variations (dashboard API shape) */
type TransformProductInput = Omit<
	ProductWithVariations,
	"viewCount" | "productAttributes" | "variations"
> & {
	viewCount?: number;
	productAttributes?: ProductAttributeFormData[] | string | null;
	storeLocationIds?: (number | null)[];
	variations?: TransformVariationInput[] | ProductVariationWithAttributes[];
};

/**
 * Transform product data from API into form data format
 */
export function transformProductToFormData(product: TransformProductInput): {
	formData: ProductFormData;
	variations: Variation[];
	selectedVariationAttributes: string[];
	storeLocationIds: number[];
	isAutoSlug: boolean;
} {
	// Convert variations to the frontend format
	const formattedVariations =
		product.variations?.map((variation: ProductVariationWithAttributes) => {
			const attributeValues: Record<string, string> = {};
			variation.attributes?.forEach((attr) => {
				attributeValues[attr.attributeId] = attr.value;
			});

			return {
				id: variation.id.toString(),
				sku: variation.sku,
				price: variation.price,
				discount: variation.discount,
				sort: variation.sort ?? 0,
				attributeValues,
			};
		}) || [];

	const selectedAttributes = new Set<string>();
	formattedVariations.forEach((variation) => {
		Object.keys(variation.attributeValues).forEach((attrId) => {
			selectedAttributes.add(attrId);
		});
	});

	const isCustomSlug = product.slug !== generateSlug(product.name);

	// Parse images string
	let imagesString = "";
	if (product.images) {
		try {
			const imagesArray = JSON.parse(product.images) as string[];
			imagesString = imagesArray.join(", ");
		} catch {
			if (typeof product.images === "string") {
				if (product.images.startsWith("[") && product.images.endsWith("]")) {
					const matches = product.images.match(/"([^"]+)"/g);
					if (matches) {
						const filenames = matches.map((match) => match.replace(/"/g, ""));
						imagesString = filenames.join(", ");
					}
				} else {
					imagesString = product.images;
				}
			}
		}
	}

	// Parse attributes
	let parsedAttributes: ProductAttributeFormData[] = [];
	if (product.productAttributes) {
		if (Array.isArray(product.productAttributes)) {
			parsedAttributes = product.productAttributes;
		} else if (typeof product.productAttributes === "string") {
			try {
				const parsed = JSON.parse(product.productAttributes);
				parsedAttributes = Array.isArray(parsed) ? parsed : [];
			} catch {
				parsedAttributes = [];
			}
		}
	}

	// Parse tags
	let parsedTags: string[] = [];
	if (product.tags) {
		try {
			parsedTags = JSON.parse(product.tags) as string[];
		} catch {
			parsedTags = [];
		}
	}

	const formData: ProductFormData = {
		name: product.name,
		slug: product.slug,
		sku: product.sku || "",
		description: product.description || "",
		importantNote: product.importantNote || "",
		tags: parsedTags,
		price: product.price.toString(),
		squareMetersPerPack: product.squareMetersPerPack?.toString() || "",
		unitOfMeasurement: product.unitOfMeasurement || "упаковка",
		categorySlug: product.categorySlug || "",
		brandSlug: product.brandSlug || "",
		collectionSlug: product.collectionSlug || "",
		isActive: product.isActive,
		isFeatured: product.isFeatured,
		discount: product.discount,
		hasVariations: product.hasVariations,
		images: imagesString,
		attributes: parsedAttributes,
		variations: [],
		dimensions: product.dimensions || "",
	};

	const storeLocationIds = (
		(product as { storeLocationIds?: (number | null)[] }).storeLocationIds || []
	).filter((id): id is number => id !== null);

	return {
		formData,
		variations: formattedVariations,
		selectedVariationAttributes: Array.from(selectedAttributes),
		storeLocationIds,
		isAutoSlug: !isCustomSlug,
	};
}
