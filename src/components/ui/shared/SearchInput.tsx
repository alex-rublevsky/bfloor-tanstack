import { forwardRef, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { SearchSuggestions } from "../search/SearchSuggestions";
import { Button } from "./Button";
import { Search, X } from "./Icon";

interface SearchInputProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"onChange" | "onSubmit"
	> {
	value: string;
	onChange: (value: string) => void;
	onClear?: () => void;
	onSubmit?: (value: string) => void;
	placeholder?: string;
	className?: string;
	showSuggestions?: boolean; // New prop to enable/disable suggestions
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	(
		{
			value,
			onChange,
			onClear,
			onSubmit,
			placeholder = "Search...",
			className,
			showSuggestions = false,
			...props
		},
		ref,
	) => {
		const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
		const inputWrapperRef = useRef<HTMLDivElement>(null);

		const handleClear = () => {
			onChange("");
			onClear?.();
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			// Handle Enter key
			if (e.key === "Enter" && onSubmit) {
				// If suggestions are open and there's a selection, let SearchSuggestions handle it
				// Otherwise, submit the current value
				if (!isSuggestionsOpen || !showSuggestions) {
					e.preventDefault();
					onSubmit(value);
				}
			}
			// Call original onKeyDown if provided
			props.onKeyDown?.(e);
		};

		const handleSuggestionSelect = (suggestion: string) => {
			onChange(suggestion);
			setIsSuggestionsOpen(false);
			onSubmit?.(suggestion);
		};

		const handleClearSearch = () => {
			onChange("");
			setIsSuggestionsOpen(false);
		};

		const handleFocus = () => {
			if (showSuggestions) {
				setIsSuggestionsOpen(true);
			}
		};

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onChange(e.target.value);
			// Keep suggestions open when typing (if enabled)
			if (showSuggestions) {
				setIsSuggestionsOpen(true);
			}
		};

		const handleSearchClick = () => {
			if (onSubmit && value.trim()) {
				onSubmit(value);
			}
		};

		return (
			<div className="flex w-full items-center gap-1">
				{value && (
					<Button
						size="icon"
						variant="secondary"
						type="button"
						onClick={handleClear}
						className="group h-9 w-9 shrink-0"
						aria-label="Очистить поиск"
					>
						<X className="h-4 w-4 text-primary transition-standard group-hover:text-primary-foreground" />
					</Button>
				)}
				<div ref={inputWrapperRef} className="relative w-full">
					<input
						ref={ref}
						type="text"
						value={value}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						onFocus={handleFocus}
						placeholder={placeholder}
						className={cn(
							"flex h-9 w-full min-w-[6ch] rounded-md border-[1.5px] border-input bg-background px-3 py-1 pr-10 text-base shadow-xs transition-standard file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground hover:border-accent focus-visible:border-accent focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[6ch] md:pr-8 md:pl-2 md:text-sm lg:min-w-[15ch] lg:px-3",
							className,
						)}
						{...props}
					/>
					<Button
						type="button"
						onClick={handleSearchClick}
						className="-translate-y-1/2 group absolute top-1/2 right-1 h-auto w-auto rounded-sm border-0 p-1.5"
						aria-label="Поиск"
						variant="secondary"
					>
						<Search
							size={18}
							className="text-accent transition-standard group-hover:text-primary-foreground"
						/>
					</Button>

					{/* Search suggestions dropdown */}
					{showSuggestions && (
						<SearchSuggestions
							query={value}
							onSelect={handleSuggestionSelect}
							onClose={() => setIsSuggestionsOpen(false)}
							isOpen={isSuggestionsOpen}
							inputRef={inputWrapperRef}
							onClearSearch={handleClearSearch}
						/>
					)}
				</div>
			</div>
		);
	},
);

SearchInput.displayName = "SearchInput";
