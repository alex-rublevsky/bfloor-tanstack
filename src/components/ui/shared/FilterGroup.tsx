import { cva } from "class-variance-authority";
import useSound from "use-sound";
import { cn } from "~/utils/utils";

interface FilterOption {
	slug: string;
	name: string;
}
interface FilterButtonProps {
	onClick: () => void;
	isSelected: boolean;
	isDisabled?: boolean;
	children: React.ReactNode;
	className?: string;
	variant?: "default" | "product";
	title?: string;
}

const buttonVariants = cva("transition-all duration-200 border", {
	variants: {
		variant: {
			default: "text-xs px-1.5 md:px-2 py-1 md:py-1.5 rounded-full",
			product: "px-1.5 py-0.5 rounded-full",
		},
		state: {
			selected: "border-primary bg-primary text-primary-foreground",
			unselected:
				"border-border bg-background/80 hover:border-primary hover:bg-primary/5 active:border-primary active:bg-primary/5 active:scale-95",
			disabled:
				"border-border bg-muted hover:border-black active:border-black text-muted-foreground",
			"selected-disabled":
				"border-muted-foreground bg-muted/50 text-muted-foreground",
		},
	},
	defaultVariants: {
		variant: "default",
		state: "unselected",
	},
});

function FilterButton({
	onClick,
	isSelected,
	isDisabled = false,
	children,
	className,
	variant = "default",
	title,
}: FilterButtonProps) {
	const [playHoverSound] = useSound("/assets/plunger-immediate.mp3", {
		volume: 0.25,
	});

	const state = isDisabled
		? isSelected
			? "selected-disabled"
			: "disabled"
		: isSelected
			? "selected"
			: "unselected";

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				e.preventDefault();
				onClick();
			}}
			className={cn(
				// Use cursor-not-allowed for disabled buttons, cursor-pointer for enabled buttons
				"shrink-0 cursor-pointer whitespace-nowrap",
				buttonVariants({ variant, state }),
				className,
			)}
			title={title}
			onMouseEnter={() => {
				if (!isDisabled) {
					playHoverSound();
				}
			}}
			onMouseLeave={() => {}}
		>
			{children}
		</button>
	);
}

interface FilterGroupProps {
	title?: string;
	options: (FilterOption | string)[];
	selectedOptions: string | null | string[];
	onOptionChange:
		| ((option: string | null) => void)
		| ((option: string) => void)
		| ((options: string[]) => void);
	className?: string;
	showAllOption?: boolean;
	allOptionLabel?: string;
	variant?: "default" | "product";
	getOptionAvailability?: (option: string) => boolean;
	titleClassName?: string;
	/**
	 * Layout control for options container. Default is flex-wrap.
	 * - "wrap": traditional multi-line wrapping
	 * - "horizontalGrid": 3-row grid flowing by columns, horizontally scrollable
	 */
	layout?: "wrap" | "horizontalGrid";
	/**
	 * Force a single row with no wrapping (used for mobile multi-row scroller rows)
	 */
	noWrap?: boolean;
	/**
	 * Enable multi-select mode. When true, selectedOptions should be string[] and
	 * onOptionChange will be called with the updated array of selected values.
	 */
	multiSelect?: boolean;
}

export function FilterGroup({
	title,
	options,
	selectedOptions,
	onOptionChange,
	className,
	showAllOption = true,
	allOptionLabel = "Все",
	variant = "default",
	getOptionAvailability,
	titleClassName,
	layout = "wrap",
	noWrap = false,
	multiSelect = false,
}: FilterGroupProps) {
	const handleOptionClick = (optionSlug: string) => {
		if (multiSelect) {
			const currentSelection = Array.isArray(selectedOptions)
				? selectedOptions
				: [];
			const newSelection = currentSelection.includes(optionSlug)
				? currentSelection.filter((s) => s !== optionSlug)
				: [...currentSelection, optionSlug];
			(onOptionChange as (options: string[]) => void)(newSelection);
		} else {
			(onOptionChange as (option: string | null) => void)(
				selectedOptions === optionSlug ? null : optionSlug,
			);
		}
	};

	const isSelected = (optionSlug: string) => {
		if (multiSelect) {
			return Array.isArray(selectedOptions)
				? selectedOptions.includes(optionSlug)
				: false;
		}
		return selectedOptions === optionSlug;
	};

	const getOptionName = (option: FilterOption | string) => {
		return typeof option === "string" ? option : option.name;
	};

	const getOptionSlug = (option: FilterOption | string) => {
		return typeof option === "string" ? option : option.slug;
	};

	const containerBase = noWrap
		? "flex gap-1 flex-nowrap"
		: layout === "horizontalGrid"
			? "flex flex-col flex-wrap h-24 gap-1 overflow-x-auto overflow-y-hidden"
			: "flex flex-wrap gap-1";

	return (
		<div className="space-y-2">
			{title && (
				<div
					className={cn(
						variant === "product"
							? "mb-1 font-medium text-muted-foreground text-xs"
							: "font-medium text-sm",
						titleClassName,
					)}
				>
					{title}
				</div>
			)}
			<div className={cn(containerBase, className)}>
				{showAllOption && !multiSelect && (
					<FilterButton
						onClick={() =>
							(onOptionChange as (option: string | null) => void)(null)
						}
						isSelected={
							multiSelect
								? false
								: selectedOptions === null ||
									(Array.isArray(selectedOptions) &&
										selectedOptions.length === 0)
						}
						variant={variant}
					>
						{allOptionLabel}
					</FilterButton>
				)}
				{options.map((option) => {
					const optionSlug = getOptionSlug(option);
					const isAvailable = getOptionAvailability
						? getOptionAvailability(optionSlug)
						: true;

					return (
						<FilterButton
							key={optionSlug}
							onClick={() => handleOptionClick(optionSlug)}
							isSelected={isSelected(optionSlug)}
							isDisabled={!isAvailable}
							variant={variant}
							title={!isAvailable ? "This option is not available" : undefined}
						>
							{getOptionName(option)}
						</FilterButton>
					);
				})}
			</div>
		</div>
	);
}
