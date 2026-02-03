import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { Input } from "~/components/ui/shared/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/shared/Tooltip";
import { cn } from "~/utils/utils";

interface SliderProps
	extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
	showTooltip?: boolean;
	tooltipContent?: (value: number) => React.ReactNode;
	label?: string;
	valueDisplay?: React.ReactNode;
	className?: string;
	showInputs?: boolean;
	formatValue?: (value: number) => string;
	parseValue?: (value: string) => number;
	/** Called when user commits the value (e.g. releases thumb or blurs number input). */
	onValueCommit?: (value: number[]) => void;
	/** Optional extra class for the number inputs (e.g. font-digital-mono text-base for price). */
	inputClassName?: string;
}

const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	SliderProps
>(
	(
		{
			className,
			showTooltip = false,
			tooltipContent,
			label,
			valueDisplay,
			showInputs = true,
			formatValue: formatValueProp,
			parseValue: parseValueProp,
			onValueCommit,
			inputClassName,
			min = 0,
			max = 100,
			step = 1,
			...props
		},
		ref,
	) => {
		// Memoize format and parse functions
		const formatValue = React.useCallback(
			(v: number) => (formatValueProp ? formatValueProp(v) : v.toString()),
			[formatValueProp],
		);

		const parseValue = React.useCallback(
			(v: string) => {
				if (parseValueProp) {
					return parseValueProp(v);
				}
				const parsed = Number.parseFloat(v);
				return Number.isNaN(parsed) ? 0 : parsed;
			},
			[parseValueProp],
		);

		const [showTooltipState, setShowTooltipState] = React.useState(false);

		// Initialize state from props
		const [internalValue, setInternalValue] = React.useState<number[]>(() => {
			const initial = (props.defaultValue as number[]) ??
				(props.value as number[]) ?? [min];
			return initial;
		});

		// Input field values (as strings for controlled inputs)
		const [inputValues, setInputValues] = React.useState<[string, string]>(
			() => {
				const initial = internalValue;
				return [formatValue(initial[0] ?? min), formatValue(initial[1] ?? max)];
			},
		);

		// Track if we're updating from internal changes to prevent loops
		const isInternalUpdateRef = React.useRef(false);
		const prevValueRef = React.useRef(props.value);

		// Sync with external value changes (but not from our own updates)
		React.useEffect(() => {
			if (props.value !== undefined && !isInternalUpdateRef.current) {
				// Check if value actually changed
				const prevValue = prevValueRef.current;
				const currentValue = props.value as number[];
				const hasChanged =
					!prevValue ||
					prevValue.length !== currentValue.length ||
					prevValue.some((val, idx) => val !== currentValue[idx]);

				if (hasChanged) {
					prevValueRef.current = currentValue;
					setInternalValue(currentValue);
					if (currentValue.length >= 2) {
						setInputValues([
							formatValue(currentValue[0] ?? min),
							formatValue(currentValue[1] ?? max),
						]);
					} else if (currentValue.length === 1) {
						setInputValues([
							formatValue(currentValue[0] ?? min),
							formatValue(max),
						]);
					}
				}
			}
			// Reset the flag after processing
			isInternalUpdateRef.current = false;
		}, [props.value, min, max, formatValue]);

		const handleValueChange = React.useCallback(
			(newValue: number[]) => {
				// Check if value actually changed
				const hasChanged =
					internalValue.length !== newValue.length ||
					internalValue.some((val, idx) => val !== newValue[idx]);

				if (hasChanged) {
					isInternalUpdateRef.current = true;
					setInternalValue(newValue);
					if (newValue.length >= 2) {
						setInputValues([
							formatValue(newValue[0] ?? min),
							formatValue(newValue[1] ?? max),
						]);
					} else if (newValue.length === 1) {
						setInputValues([formatValue(newValue[0] ?? min), formatValue(max)]);
					}
					props.onValueChange?.(newValue);
				}
			},
			[internalValue, formatValue, min, max, props.onValueChange],
		);

		const handleInputChange = React.useCallback(
			(index: 0 | 1, value: string) => {
				setInputValues((prev) => {
					const newValues: [string, string] = [...prev];
					newValues[index] = value;
					return newValues;
				});

				const parsed = parseValue(value);
				if (!Number.isNaN(parsed)) {
					const clamped = Math.max(min, Math.min(max, parsed));
					setInternalValue((prev) => {
						const newSliderValue = [...prev];
						newSliderValue[index] = clamped;

						// Ensure min <= max
						if (index === 0 && newSliderValue[1] !== undefined) {
							newSliderValue[0] = Math.min(clamped, newSliderValue[1]);
						} else if (index === 1 && newSliderValue[0] !== undefined) {
							newSliderValue[1] = Math.max(clamped, newSliderValue[0]);
						}

						// Only call onValueChange if value actually changed
						const currentVal = prev[index];
						const newVal = newSliderValue[index];
						if (currentVal !== newVal) {
							isInternalUpdateRef.current = true;
							props.onValueChange?.(newSliderValue);
						}

						return newSliderValue;
					});
				}
			},
			[parseValue, min, max, props.onValueChange],
		);

		const handleInputBlur = React.useCallback(
			(index: 0 | 1) => {
				// On blur, ensure the input value is valid and update to clamped value
				setInputValues((prev) => {
					const parsed = parseValue(prev[index]);
					if (Number.isNaN(parsed)) {
						// Reset to current slider value if invalid
						const newValues: [string, string] = [...prev];
						setInternalValue((current) => {
							const val = current[index] ?? (index === 0 ? min : max);
							newValues[index] = formatValue(val);
							return current;
						});
						return newValues;
					} else {
						const clamped = Math.max(min, Math.min(max, parsed));
						setInternalValue((current) => {
							const newSliderValue = [...current];
							newSliderValue[index] = clamped;

							// Ensure min <= max
							if (index === 0 && newSliderValue[1] !== undefined) {
								newSliderValue[0] = Math.min(clamped, newSliderValue[1]);
							} else if (index === 1 && newSliderValue[0] !== undefined) {
								newSliderValue[1] = Math.max(clamped, newSliderValue[0]);
							}

							// Update input value with the final clamped value
							const finalValue =
								newSliderValue[index] ?? (index === 0 ? min : max);
							const newInputValues: [string, string] = [...prev];
							newInputValues[index] = formatValue(finalValue);
							setInputValues(newInputValues);

							isInternalUpdateRef.current = true;
							props.onValueChange?.(newSliderValue);
							onValueCommit?.(newSliderValue);

							return newSliderValue;
						});

						return prev;
					}
				});
			},
			[formatValue, parseValue, min, max, props.onValueChange, onValueCommit],
		);

		const handlePointerDown = () => {
			if (showTooltip) {
				setShowTooltipState(true);
			}
		};

		const handlePointerUp = React.useCallback(() => {
			if (showTooltip) {
				setShowTooltipState(false);
			}
		}, [showTooltip]);

		React.useEffect(() => {
			if (showTooltip) {
				document.addEventListener("pointerup", handlePointerUp);
				return () => {
					document.removeEventListener("pointerup", handlePointerUp);
				};
			}
		}, [showTooltip, handlePointerUp]);

		const renderThumb = (value: number, index: number) => {
			const thumb = (
				<SliderPrimitive.Thumb
					key={index}
					className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-[3px] focus-visible:outline-ring/40 active:cursor-grabbing data-disabled:cursor-not-allowed"
					onPointerDown={handlePointerDown}
				/>
			);

			if (!showTooltip) return thumb;

			return (
				<TooltipProvider key={index}>
					<Tooltip open={showTooltipState}>
						<TooltipTrigger asChild>{thumb}</TooltipTrigger>
						<TooltipContent
							className="px-2 py-1 text-xs"
							sideOffset={8}
							side={props.orientation === "vertical" ? "right" : "top"}
						>
							<p>{tooltipContent ? tooltipContent(value) : value}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		};

		const hasTwoValues = internalValue.length >= 2;

		return (
			<div
				className={cn("w-full min-w-52 space-y-4 sm:max-w-[20rem]", className)}
			>
				{(label || valueDisplay) && (
					<div className="flex items-center justify-between gap-2">
						{label && <p className="font-medium text-sm">{label}</p>}
						{valueDisplay}
					</div>
				)}

				{showInputs && hasTwoValues && (
					<div className="flex w-full items-center gap-0">
						<div className="flex-1">
							<Input
								type="number"
								value={inputValues[0]}
								onChange={(e) => handleInputChange(0, e.target.value)}
								onBlur={() => handleInputBlur(0)}
								min={min}
								max={max}
								step={step}
								className={cn(
									"h-8 rounded-r-none border-r-0 text-s",
									inputClassName,
								)}
								aria-label="Minimum value"
							/>
						</div>
						<div className="flex-1">
							<Input
								type="number"
								value={inputValues[1]}
								onChange={(e) => handleInputChange(1, e.target.value)}
								onBlur={() => handleInputBlur(1)}
								min={min}
								max={max}
								step={step}
								className={cn("-ml-px h-8 rounded-l-none text-s", inputClassName)}
								aria-label="Maximum value"
							/>
						</div>
					</div>
				)}

				<div
					className="w-full"
					onPointerDown={(e) => {
						// Stop propagation in bubble phase after slider has received the event
						// This prevents the drawer from receiving it, but allows slider to work
						e.stopPropagation();
					}}
					style={{ touchAction: "none" }}
				>
					<SliderPrimitive.Root
						ref={ref}
						className={cn(
							"relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-disabled:opacity-50",
						)}
						value={internalValue}
						onValueChange={handleValueChange}
						onValueCommit={onValueCommit}
						min={min}
						max={max}
						step={step}
						{...props}
					>
						<SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
							<SliderPrimitive.Range className="absolute h-full bg-primary" />
						</SliderPrimitive.Track>
						{internalValue.map((value, index) => renderThumb(value, index))}
					</SliderPrimitive.Root>
				</div>
			</div>
		);
	},
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
