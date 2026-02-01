/**
 * SearchSuggestions Component
 * Autocomplete dropdown for search input
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/shared/Button";
import { Search, TrendingUp } from "~/components/ui/shared/Icon";
import { ASSETS_BASE_URL } from "~/constants/urls";
import {
	popularSearchTerms,
	type SearchSuggestion,
	searchSuggestions,
} from "~/server_functions/search/searchSuggestions";

interface SearchSuggestionsProps {
	query: string;
	onSelect: (suggestion: string) => void;
	onClose: () => void;
	isOpen: boolean;
	className?: string;
	inputRef?: React.RefObject<HTMLElement | null>; // Reference to the input element
	onClearSearch?: () => void; // Callback to clear the search input
}

export function SearchSuggestions({
	query,
	onSelect,
	onClose,
	isOpen,
	className = "",
	inputRef,
	onClearSearch,
}: SearchSuggestionsProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const suggestionsRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	// Fetch suggestions based on query
	const { data: suggestionsData } = useQuery({
		queryKey: ["searchSuggestions", query],
		queryFn: () =>
			query.trim().length >= 2
				? searchSuggestions({ data: { query, limit: 8 } })
				: popularSearchTerms({ data: { limit: 5 } }),
		enabled: isOpen,
		staleTime: 60000, // 1 minute
	});

	const suggestions = suggestionsData?.suggestions || [];

	// Handle suggestion click - navigate for categories/brands/collections, search for products
	const handleSuggestionClick = useCallback(
		(suggestion: SearchSuggestion) => {
			onClose();

			// For categories - navigate to category page (categories are now pages, not filters)
			// For brands and collections - navigate to store with filter
			// Clear the search input since the filter is now active
			if (suggestion.type === "category" && suggestion.metadata?.slug) {
				onClearSearch?.(); // Clear search input
				navigate({
					to: `/store/${suggestion.metadata.slug}`,
				});
			} else if (suggestion.type === "brand" && suggestion.metadata?.slug) {
				onClearSearch?.();
				navigate({ to: `/store/${suggestion.metadata.slug}` });
			} else if (
				suggestion.type === "collection" &&
				suggestion.metadata?.slug
			) {
				onClearSearch?.();
				navigate({ to: "/store" });
			} else {
				// For products - use the search functionality
				// Keep the search input (it's the active filter)
				onSelect(suggestion.text);
			}
		},
		[navigate, onClose, onSelect, onClearSearch],
	);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen || suggestions.length === 0) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev < suggestions.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev > 0 ? prev - 1 : suggestions.length - 1,
					);
					break;
				case "Enter":
					e.preventDefault();
					if (suggestions[selectedIndex]) {
						handleSuggestionClick(suggestions[selectedIndex]);
					}
					break;
				case "Escape":
					e.preventDefault();
					onClose();
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, suggestions, selectedIndex, handleSuggestionClick, onClose]);

	// Click outside to close
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;

			// Don't close if clicking on the suggestions dropdown
			if (suggestionsRef.current?.contains(target)) {
				return;
			}

			// Don't close if clicking on the input field
			if (inputRef?.current?.contains(target)) {
				return;
			}

			// Close if clicking anywhere else
			onClose();
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen, onClose, inputRef]);

	// Reset selected index when suggestions change
	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset on any suggestion change
	useEffect(() => {
		setSelectedIndex(0);
	}, [suggestions]);

	if (!isOpen || suggestions.length === 0) {
		return null;
	}

	const isShowingPopular = query.trim().length < 2;

	return (
		<div
			ref={suggestionsRef}
			className={`absolute z-50 mt-2 w-full overflow-hidden rounded-lg border-2 border-primary bg-background shadow-lg ${className}`}
		>
			{isShowingPopular && (
				<div className="flex items-center gap-2 border-border border-b px-4 py-2 font-medium text-muted-foreground text-sm">
					<TrendingUp className="h-4 w-4" />
					Популярные запросы
				</div>
			)}

			<ul className="max-h-[400px] overflow-y-auto">
				{suggestions.map((suggestion, index) => (
					<li key={`${suggestion.type}-${index}`}>
						<Button
							type="button"
							onClick={() => handleSuggestionClick(suggestion)}
							onMouseEnter={() => setSelectedIndex(index)}
							className={`flex h-auto w-full items-center justify-start gap-3 rounded-none px-4 py-2 text-left transition-standard hover:bg-primary hover:text-primary-foreground ${
								index === selectedIndex
									? "bg-primary text-primary-foreground"
									: "bg-transparent text-foreground"
							}`}
							asChild={false}
						>
							{suggestion.type === "product" &&
							suggestion.metadata?.imageUrl ? (
								<img
									src={`${ASSETS_BASE_URL}/${suggestion.metadata.imageUrl}`}
									alt={suggestion.text}
									className="h-8 w-8 shrink-0 rounded object-cover"
								/>
							) : (
								<Search className="h-4 w-4 shrink-0" />
							)}
							<div className="min-w-0 flex-1">
								<div className="truncate font-medium">{suggestion.text}</div>
								<div className="text-xs capitalize opacity-70">
									{getSuggestionTypeLabel(suggestion.type)}
								</div>
							</div>
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}

/**
 * Get user-friendly label for suggestion type
 */
function getSuggestionTypeLabel(type: SearchSuggestion["type"]): string {
	switch (type) {
		case "product":
			return "Товар";
		case "brand":
			return "Бренд";
		case "category":
			return "Категория";
		case "collection":
			return "Коллекция";
		default:
			return "";
	}
}
