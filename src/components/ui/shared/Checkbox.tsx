import type * as React from "react";
import { useId } from "react";

import { cn } from "~/lib/utils";
import "./checkbox.css";

interface CheckboxProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"type" | "onChange" | "checked"
	> {
	/** Optional label text to display next to the checkbox */
	label?: React.ReactNode;
	/** Additional class name for the wrapper element */
	wrapperClassName?: string;
	/** Radix-style change handler for backward compatibility */
	onCheckedChange?: (checked: boolean) => void;
	/** Native change handler */
	onChange?: React.ChangeEventHandler<HTMLInputElement>;
	/** Checked state - supports boolean or "indeterminate" for partial selection */
	checked?: boolean | "indeterminate";
}

function Checkbox({
	className,
	label,
	wrapperClassName,
	id,
	onCheckedChange,
	onChange,
	checked,
	disabled,
	...props
}: CheckboxProps) {
	const generatedId = useId();
	const checkboxId = id || generatedId;

	const isChecked = checked === true;
	const isIndeterminate = checked === "indeterminate";

	// Ref callback sets indeterminate synchronously (no useEffect needed)
	const inputRef = (el: HTMLInputElement | null) => {
		if (el) el.indeterminate = isIndeterminate;
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange?.(e);
		onCheckedChange?.(e.target.checked);
	};

	// Use label when there's label text, otherwise use span to avoid issues with preventDefault
	const Wrapper = label ? "label" : "span";

	return (
		<Wrapper
			htmlFor={label ? checkboxId : undefined}
			className={cn("checkbox-wrapper", wrapperClassName)}
			onClick={
				label
					? undefined
					: (e) => {
							// For span wrapper: manually toggle via native click (triggers onChange)
							if (disabled) return;
							const input = (e.currentTarget as HTMLElement).querySelector(
								"input",
							);
							input?.click();
						}
			}
		>
			<input
				ref={inputRef}
				type="checkbox"
				id={checkboxId}
				className={cn("checkbox-input", className)}
				onChange={handleChange}
				checked={isChecked}
				disabled={disabled}
				{...props}
			/>
			<span className="checkbox-check" aria-hidden="true">
				<span className="checkbox-fill">
					{isIndeterminate ? (
						<svg
							viewBox="0 0 16 4"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							role="img"
							aria-label="Indeterminate"
						>
							<path
								d="M2 2H14"
								stroke="var(--primary-foreground)"
								strokeWidth={3}
								strokeLinecap="round"
							/>
						</svg>
					) : (
						<svg
							viewBox="0 0 16 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							role="img"
							aria-label="Checkmark"
						>
							<path
								d="M2 6L6 10L14 2"
								pathLength={1}
								strokeDasharray={1}
								stroke="var(--primary-foreground)"
								strokeWidth={3}
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					)}
				</span>
			</span>
			{label && <span className="checkbox-label">{label}</span>}
		</Wrapper>
	);
}

export { Checkbox };
export type { CheckboxProps };
