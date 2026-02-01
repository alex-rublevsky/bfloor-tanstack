import { Minus, Plus } from "./Icon";

interface QuantitySelectorButtonProps {
	onClick: () => void;
	disabled: boolean;
	size: "default" | "compact";
	styles: {
		button: string;
		text: string;
		iconSize: number;
	};
	isIncrement: boolean;
	ariaLabel: string;
}

function QuantitySelectorButton({
	onClick,
	disabled,
	size,
	styles,
	isIncrement,
	ariaLabel,
}: QuantitySelectorButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${styles.button} flex items-center justify-center transition hover:bg-muted active:bg-muted ${
				disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
			}`}
			disabled={disabled}
			aria-label={ariaLabel}
		>
			{size === "default" ? (
				<span className={styles.text}>{isIncrement ? "+" : "-"}</span>
			) : isIncrement ? (
				<Plus size={styles.iconSize} />
			) : (
				<Minus size={styles.iconSize} />
			)}
		</button>
	);
}

export interface QuantitySelectorProps {
	quantity: number;
	onIncrement: () => void;
	onDecrement: () => void;
	minQuantity?: number;
	maxQuantity?: number;
	disabled?: boolean;
	size?: "default" | "compact";
}

export function QuantitySelector({
	quantity,
	onIncrement,
	onDecrement,
	minQuantity = 1,
	maxQuantity = Infinity,
	disabled = false,
	size = "default",
}: QuantitySelectorProps) {
	// Determine if buttons should be disabled
	const isDecrementDisabled = disabled || quantity <= minQuantity;
	const isIncrementDisabled = disabled || quantity >= maxQuantity;

	// Size-specific styles
	const sizeStyles = {
		default: {
			container: "space-x-4",
			button: "w-10 h-10 rounded-[15px]",
			text: "text-2xl",
			quantityText: "text-xl font-medium",
			iconSize: 20,
		},
		compact: {
			container: "space-x-2",
			button: "w-8 h-8 rounded-[15px]",
			text: "text-sm",
			quantityText: "text-sm",
			iconSize: 14,
		},
	};

	const styles = sizeStyles[size];

	return (
		<div className={`flex items-center ${styles.container}`}>
			<QuantitySelectorButton
				onClick={onDecrement}
				disabled={isDecrementDisabled}
				size={size}
				styles={styles}
				isIncrement={false}
				ariaLabel="Уменьшить количество"
			/>
			<span className={styles.quantityText}>{quantity}</span>
			<QuantitySelectorButton
				onClick={onIncrement}
				disabled={isIncrementDisabled}
				size={size}
				styles={styles}
				isIncrement={true}
				ariaLabel="Увеличить количество"
			/>
		</div>
	);
}
