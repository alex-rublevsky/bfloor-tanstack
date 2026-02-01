import * as React from "react";

import { cn } from "~/lib/utils";

interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	required?: boolean;
	error?: string;
	labelBackgroundColor?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			className,
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
		const textareaId = React.useId();
		const finalId = id || textareaId;
		const [isFocused, setIsFocused] = React.useState(false);
		const [hasValue, setHasValue] = React.useState(
			Boolean(value || defaultValue),
		);
		const textareaRef = React.useRef<HTMLTextAreaElement>(null);
		const combinedRef = React.useCallback(
			(node: HTMLTextAreaElement | null) => {
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
				textareaRef.current = node;
			},
			[ref],
		);

		React.useEffect(() => {
			setHasValue(Boolean(value || defaultValue));
		}, [value, defaultValue]);

		const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
			setIsFocused(true);
			props.onFocus?.(e);
		};

		const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
			setIsFocused(false);
			setHasValue(Boolean(e.target.value));
			props.onBlur?.(e);
		};

		const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setHasValue(Boolean(e.target.value));
			props.onChange?.(e);
		};

		const isLabelFloating = isFocused || hasValue;

		return (
			<div className="relative min-h-[60px]">
				{label && (
					<label
						htmlFor={finalId}
						className={cn(
							"absolute left-3 text-sm text-muted-foreground pointer-events-none transition-faster origin-left z-10",
							isLabelFloating && [
								"top-0 -translate-y-1/2 scale-75 px-1 text-foreground",
								labelBackgroundColor || "bg-background",
							],
							!isLabelFloating && "top-4",
						)}
					>
						<span className="flex items-center gap-1">
							{label}
							{required && <span className="text-destructive">*</span>}
						</span>
					</label>
				)}

				<textarea
					id={finalId}
					value={value}
					defaultValue={defaultValue}
					className={cn(
						"flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 transition-faster placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 field-sizing-content resize-none",
						label && isLabelFloating && "pt-4",
						error &&
							"border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
						className,
					)}
					ref={combinedRef}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleChange}
					data-vaul-no-drag=""
					{...props}
				/>

				{error && (
					<span className="absolute -bottom-5 left-0 text-red-500 text-xs font-medium">
						{error}
					</span>
				)}
			</div>
		);
	},
);
Textarea.displayName = "Textarea";

export { Textarea };
