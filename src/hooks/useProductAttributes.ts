import { useQuery } from "@tanstack/react-query";
import { productAttributesQueryOptions } from "~/lib/queryOptions";
import type { ProductAttribute } from "~/types";

export function useProductAttributes() {
	return useQuery(productAttributesQueryOptions());
}

/**
 * Generate a SKU for a product variation based on the product slug and attributes
 * Format: {product-slug}-{attribute-slug}-{value}-{attribute-slug}-{value}
 * Example: rulonnoe-rezinovoe-pokrytie-pyatachok-thickness-mm-3-width-mm-1-5
 */
export function generateVariationSKU(
	productSlug: string,
	attributes: Array<{ attributeId: string; value: string }>,
	attributeDefinitions: ProductAttribute[],
): string {
	if (!attributes || attributes.length === 0) {
		return productSlug;
	}

	// Sort attributes by attributeId to ensure consistent SKU generation
	const sortedAttributes = [...attributes].sort((a, b) =>
		a.attributeId.localeCompare(b.attributeId),
	);

	// Build the SKU parts
	const skuParts = [productSlug];

	for (const attr of sortedAttributes) {
		// Find the attribute definition to get the slug
		const attrDef = attributeDefinitions.find(
			(def) => def.id.toString() === attr.attributeId,
		);
		const attributeSlug =
			attrDef?.slug || attr.attributeId.toLowerCase().replace(/_/g, "-");

		// Convert value to SKU-friendly format
		// Replace dots with dashes, remove special characters, convert to lowercase
		const valueSlug = attr.value
			.toString()
			.toLowerCase()
			.replace(/\./g, "-") // Replace dots with dashes
			.replace(/[^a-z0-9-]/g, "") // Remove special characters except dashes
			.replace(/-+/g, "-") // Replace multiple dashes with single dash
			.replace(/^-|-$/g, ""); // Remove leading/trailing dashes

		if (valueSlug) {
			skuParts.push(`${attributeSlug}-${valueSlug}`);
		}
	}

	return skuParts.join("-");
}

/**
 * Helper function to get the display name for an attribute ID
 * Uses the name field from the database as the display name
 */
export function getAttributeDisplayName(
	attributeId: string,
	attributes: ProductAttribute[],
): string {
	const attribute = attributes.find(
		(attr) => attr.id.toString() === attributeId,
	);
	return attribute ? attribute.name : attributeId;
}

/**
 * Helper function to get the slug for an attribute name
 */
export function getAttributeSlug(
	attributeName: string,
	attributes: ProductAttribute[],
): string {
	const attribute = attributes.find((attr) => attr.name === attributeName);
	return attribute?.slug || attributeName.toLowerCase().replace(/_/g, "-");
}

/**
 * Helper function to get the attribute name from a slug
 */
export function getAttributeNameFromSlug(
	slug: string,
	attributes: ProductAttribute[],
): string {
	const attribute = attributes.find((attr) => attr.slug === slug);
	return attribute?.name || slug.replace(/-/g, "_").toUpperCase();
}
