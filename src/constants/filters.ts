// Filter layout configuration and display order
// Single source of truth for filter order across storefront and dashboard

/**
 * Default order of attribute filters (by attribute slug).
 * Used by getAttributeValuesForFiltering and any UI that displays attribute filters.
 * Attributes not listed appear after these, sorted by slug.
 * Mapping: Дизайн, Толщина, Фаска, Класс (пожар./износ.), Теплый пол
 */
export const ATTRIBUTE_FILTER_DISPLAY_ORDER = [
	"design", // Дизайн
	"thickness-mm", // Толщина
	"bevel", // Фаска
	"fire-safety-class", // Класс пожарной безопасности
	"wear-resistance-class", // Класс износостойкости
	"warm-floor-compatible", // Теплый пол
] as const;

/**
 * Get sort index for an attribute slug (lower = earlier). Unknown slugs get Infinity.
 */
export function getAttributeFilterSortIndex(slug: string): number {
	const idx = (ATTRIBUTE_FILTER_DISPLAY_ORDER as readonly string[]).indexOf(
		slug,
	);
	return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

// --- Layout: wrap vs row ---
// Attributes that should use "wrap" layout (all options visible, natural wrapping)
// vs "row-based" layout (fixed rows with horizontal scrolling)

/**
 * Attribute slugs that should use "wrap" layout on mobile (and optionally desktop).
 * These filters have a normal amount of options and should be fully visible.
 */
export const WRAP_LAYOUT_ATTRIBUTE_SLUGS = [
	"design",
	"height-mm",
	"finish",
	"bevel",
	"thickness-mm",
	"sistema-montazha",
	"warm-floor-compatible",
	"podlozhka",
	"material",
	"fire-safety-class",
	"wear-resistance-class",
] as const;

/**
 * Check if an attribute should use wrap layout based on its slug
 */
export function shouldUseWrapLayout(attributeSlug: string): boolean {
	return WRAP_LAYOUT_ATTRIBUTE_SLUGS.includes(
		attributeSlug as (typeof WRAP_LAYOUT_ATTRIBUTE_SLUGS)[number],
	);
}
