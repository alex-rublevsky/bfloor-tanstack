import * as React from "react";
import { cn } from "~/utils/utils";
import "./Select.css";

/**
 * Native <select> with appearance: base-select (Chrome 135+).
 * https://developer.chrome.com/blog/a-customizable-select
 *
 * Content-sized variant: add className="field-sizing-content" to get
 * - width sized to content (field-sizing: content)
 * - balanced trigger padding (less space right of chevron)
 * - option padding so hover fills the full row; trigger and options use text-sm
 * All styling lives in Select.css (loaded by this component).
 */

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectOptionGroup = { label: string; options: SelectOption[] };

interface SelectProps {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	options: SelectOption[] | (SelectOption | SelectOptionGroup)[];
	placeholder?: string;
	required?: boolean;
	id?: string;
	className?: string;
	disabled?: boolean;
	size?: "sm" | "default"; // Size variant
	disableSelectedStyling?: boolean; // Disable primary bg on selected state
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			value: controlledValue,
			defaultValue,
			onValueChange,
			options,
			placeholder,
			required,
			id: idProp,
			className,
			disabled,
			size = "default",
			disableSelectedStyling = false,
		},
		ref,
	) => {
		const generatedId = React.useId();
		const id = idProp ?? generatedId;
		const [uncontrolledValue, setUncontrolledValue] = React.useState(
			defaultValue ?? "",
		);
		const isControlled = controlledValue !== undefined;
		const value = isControlled ? controlledValue : uncontrolledValue;

		const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
			const v = e.target.value;
			if (!isControlled) setUncontrolledValue(v);
			onValueChange?.(v);
		};

		const opts = React.useMemo(() => {
			const list: React.ReactNode[] = [];
			if (placeholder) {
				list.push(
					<option key="" value="" disabled>
						{placeholder}
					</option>,
				);
			}
			for (const item of options) {
				if ("options" in item) {
					list.push(
						<optgroup key={item.label} label={item.label}>
							{item.options.map((o) => (
								<option key={o.value} value={o.value} disabled={o.disabled}>
									{o.label}
								</option>
							))}
						</optgroup>,
					);
				} else {
					list.push(
						<option
							key={item.value}
							value={item.value}
							disabled={item.disabled}
						>
							{item.label}
						</option>,
					);
				}
			}
			return list;
		}, [options, placeholder]);

		// Determine if value is selected (not empty or default)
		const isSelected = value && value !== "" && value !== defaultValue;

		// Find first option's value to check if it's a placeholder/default
		const firstOptionValue = React.useMemo(() => {
			if (placeholder) return "";
			const firstOpt = options[0];
			return firstOpt && "value" in firstOpt ? firstOpt.value : "";
		}, [options, placeholder]);

		const hasNonDefaultValue =
			isSelected || (value && value !== firstOptionValue);

		// Check if field-sizing-content is in className
		const hasFieldSizingContent =
			className?.includes("field-sizing-content") ?? false;

		return (
			<select
				ref={ref}
				id={id}
				value={value ?? ""}
				onChange={handleChange}
				disabled={disabled}
				required={required}
				className={cn(
					"select-native cursor-pointer rounded-lg border border-input bg-background text-foreground shadow-black/5 shadow-sm transition-standard",
					"hover:border-primary active:border-primary",
					"focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
					// Only apply layout classes if NOT using field-sizing-content
					!hasFieldSizingContent && "flex min-w-0",
					// Size variants
					!hasFieldSizingContent &&
						(size === "sm"
							? "h-8 px-2.5 py-1.5 text-xs leading-tight"
							: "h-9 px-3 py-2 text-sm"),
					// When using field-sizing-content, still apply h-8 class for CSS selector
					hasFieldSizingContent && size === "sm" && "h-8",
					// Selected state styling - full primary bg with primary-foreground text
					!disableSelectedStyling &&
						hasNonDefaultValue &&
						"border-primary bg-primary text-primary-foreground hover:bg-primary/90",
					className,
				)}
			>
				{opts}
			</select>
		);
	},
);
Select.displayName = "Select";

export { Select };
