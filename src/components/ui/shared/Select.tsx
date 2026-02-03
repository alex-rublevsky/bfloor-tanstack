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
	label?: string;
	required?: boolean;
	labelBackgroundColor?: string;
	id?: string;
	className?: string;
	disabled?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			value: controlledValue,
			defaultValue,
			onValueChange,
			options,
			placeholder,
			label,
			required,
			labelBackgroundColor,
			id: idProp,
			className,
			disabled,
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

		return (
			<div className="relative h-9">
				{label && (
					<label
						htmlFor={id}
						className={cn(
							"-translate-y-1/2 pointer-events-none absolute top-0 left-3 z-10 origin-left scale-75 px-1 text-foreground text-sm",
							labelBackgroundColor ?? "bg-background",
						)}
					>
						<span className="flex items-center gap-1">
							{label}
							{required && <span className="text-destructive">*</span>}
						</span>
					</label>
				)}
				<select
					ref={ref}
					id={id}
					value={value ?? ""}
					onChange={handleChange}
					disabled={disabled}
					required={required}
					className={cn(
						"select-native flex h-9 min-w-0 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-foreground text-sm shadow-black/5 shadow-sm transition-standard",
						"hover:border-primary active:border-primary",
						"focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
						label && "pt-4",
						className,
					)}
				>
					{opts}
				</select>
			</div>
		);
	},
);
Select.displayName = "Select";

export { Select };
