/**
 * Sort categories by their `order` field from the database.
 * Categories can be reordered via the dashboard.
 */
export function sortCategoriesByDisplayOrder<T extends { order: number }>(
	categories: T[],
): T[] {
	return [...categories].sort((a, b) => a.order - b.order);
}
