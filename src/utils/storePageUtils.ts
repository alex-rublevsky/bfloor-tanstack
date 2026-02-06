/**
 * Shared utilities for store pages
 * Used by both /store and /store/$categorySlug routes
 */

import { useEffect, useState } from "react";
import { z } from "zod";

// Shared search params schema for store pages
export const storeSearchParamsSchema = z.object({
	brands: z.string().optional(), // Multi-select: comma-separated brand slugs
	collections: z.string().optional(), // Multi-select: comma-separated collection slugs
	storeLocation: z.number().optional(),
	attributeFilters: z.string().optional(), // JSON string of Record<number, string[]>
	sort: z
		.enum([
			"name",
			"price-asc",
			"price-desc",
			"newest",
			"oldest",
			"best-selling",
		])
		.optional(),
});

// Default values for search params (used for stripping defaults from URL)
export const defaultStoreSearchValues = {
	sort: "best-selling" as const,
};

// Parse attribute filters from URL - moved outside component for stability
export function parseAttributeFilters(
	attrFiltersStr?: string,
): Record<number, string[]> {
	if (!attrFiltersStr) return {};
	try {
		const parsed = JSON.parse(attrFiltersStr);
		if (typeof parsed === "object" && parsed !== null) {
			// Convert string keys to numbers
			const result: Record<number, string[]> = {};
			for (const [key, value] of Object.entries(parsed)) {
				const numKey = parseInt(key, 10);
				if (!Number.isNaN(numKey) && Array.isArray(value)) {
					result[numKey] = value.map(String);
				}
			}
			return result;
		}
	} catch {
		// Invalid JSON, return empty object
	}
	return {};
}

// Validate sort value
export function isValidSort(
	v: string,
): v is
	| "name"
	| "price-asc"
	| "price-desc"
	| "newest"
	| "oldest"
	| "best-selling" {
	return (
		v === "name" ||
		v === "price-asc" ||
		v === "price-desc" ||
		v === "newest" ||
		v === "oldest" ||
		v === "best-selling"
	);
}

// Hook to get responsive columns per row based on screen size
export function useResponsiveColumns() {
	// Initialize with safe SSR default (2 columns for mobile-first)
	const [columnsPerRow, setColumnsPerRow] = useState(() => {
		if (typeof window === "undefined") return 2;
		const width = window.innerWidth;
		if (width >= 1536) return 6; // 2xl
		if (width >= 1280) return 5; // xl
		if (width >= 1024) return 4; // lg
		if (width >= 768) return 3; // md
		return 2; // sm and below
	});

	useEffect(() => {
		// Only run on client side
		if (typeof window === "undefined") return;

		const updateColumns = () => {
			const width = window.innerWidth;
			if (width >= 1536) {
				setColumnsPerRow(6); // 2xl
			} else if (width >= 1280) {
				setColumnsPerRow(5); // xl
			} else if (width >= 1024) {
				setColumnsPerRow(4); // lg
			} else if (width >= 768) {
				setColumnsPerRow(3); // md
			} else {
				setColumnsPerRow(2); // sm and below
			}
		};

		// Update on resize
		window.addEventListener("resize", updateColumns);
		return () => window.removeEventListener("resize", updateColumns);
	}, []);

	return columnsPerRow;
}
