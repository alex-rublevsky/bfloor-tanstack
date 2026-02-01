import * as React from "react";
import { cn } from "~/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	required?: boolean;
	error?: string;
	labelBackgroundColor?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			type,
			label,
			required,
			id,
			error,
			value,
			defaultValue,
			labelBackgroundColor,
			...props
		},
		ref,
	) => {
		const inputId = React.useId();
		const finalId = id || inputId;
		const [isFocused, setIsFocused] = React.useState(false);
		const [hasValue, setHasValue] = React.useState(
			Boolean(value || defaultValue),
		);
		const inputRef = React.useRef<HTMLInputElement>(null);
		const combinedRef = React.useCallback(
			(node: HTMLInputElement | null) => {
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
				inputRef.current = node;
			},
			[ref],
		);

		React.useEffect(() => {
			setHasValue(Boolean(value || defaultValue));
		}, [value, defaultValue]);

		const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(true);
			props.onFocus?.(e);
		};

		const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(false);
			setHasValue(Boolean(e.target.value));
			props.onBlur?.(e);
		};

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setHasValue(Boolean(e.target.value));
			props.onChange?.(e);
		};

		const isLabelFloating = isFocused || hasValue;

		return (
			<div className="relative h-9">
				{label && (
					<label
						htmlFor={finalId}
						className={cn(
							"pointer-events-none absolute left-3 z-10 origin-left text-muted-foreground text-sm transition-faster",
							isLabelFloating && [
								"-translate-y-1/2 top-0 scale-75 px-1 text-foreground",
								labelBackgroundColor || "bg-background",
							],
							!isLabelFloating && "-translate-y-1/2 top-1/2",
						)}
					>
						<span className="flex items-center gap-1">
							{label}
							{required && <span className="text-destructive">*</span>}
						</span>
					</label>
				)}

				<input
					id={finalId}
					type={type}
					value={value}
					defaultValue={defaultValue}
					className={cn(
						"flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground text-sm shadow-black/5 shadow-sm transition-faster placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
						type === "search" &&
							"[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
						type === "file" &&
							"p-0 pr-3 text-muted-foreground/70 italic file:me-3 file:h-full file:border-0 file:border-input file:border-r file:border-solid file:bg-transparent file:px-3 file:font-medium file:text-foreground file:text-sm file:not-italic",
						label && isLabelFloating && "pt-4",
						error &&
							"border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
						className,
					)}
					ref={combinedRef}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleChange}
					{...props}
				/>

				{error && (
					<span className="-bottom-5 absolute left-0 font-medium text-red-500 text-xs">
						{error}
					</span>
				)}
			</div>
		);
	},
);

Input.displayName = "Input";

export { Input };
