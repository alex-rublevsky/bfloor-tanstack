import type { UseEmblaCarouselType } from "embla-carousel-react";
import type React from "react";
import {
	type ComponentPropsWithRef,
	useCallback,
	useEffect,
	useState,
} from "react";

type UsePrevNextButtonsType = {
	prevBtnDisabled: boolean;
	nextBtnDisabled: boolean;
	onPrevButtonClick: () => void;
	onNextButtonClick: () => void;
};

export const usePrevNextButtons = (
	emblaApi: UseEmblaCarouselType[1] | undefined,
): UsePrevNextButtonsType => {
	const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
	const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

	const onPrevButtonClick = useCallback(() => {
		if (!emblaApi) return;
		emblaApi.scrollPrev();
	}, [emblaApi]);

	const onNextButtonClick = useCallback(() => {
		if (!emblaApi) return;
		emblaApi.scrollNext();
	}, [emblaApi]);

	const onSelect = useCallback((emblaApi: UseEmblaCarouselType[1]) => {
		if (!emblaApi) return;
		setPrevBtnDisabled(!emblaApi.canScrollPrev());
		setNextBtnDisabled(!emblaApi.canScrollNext());
	}, []);

	useEffect(() => {
		if (!emblaApi) return;

		onSelect(emblaApi);
		emblaApi.on("reInit", onSelect).on("select", onSelect);
	}, [emblaApi, onSelect]);

	return {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick,
	};
};

type PropType = ComponentPropsWithRef<"button"> & {
	size?: "default" | "small";
};

export const PrevButton: React.FC<PropType> = ({
	size = "default",
	children,
	disabled,
	...restProps
}) => {
	const sizeClasses =
		size === "small" ? "w-[2.7rem] h-[2.7rem]" : "w-[3.6rem] h-[3.6rem]";

	return (
		<button
			className={`embla__button embla__button--prev z-[1] m-0 flex cursor-pointer items-center justify-center rounded-full border-2 border-input bg-transparent p-0 text-foreground no-underline transition-standard ${sizeClasses}`}
			type="button"
			disabled={disabled}
			{...restProps}
		>
			<svg className="h-[35%] w-[35%]" viewBox="0 0 532 532">
				<title>Previous slide</title>
				<path
					fill="currentColor"
					d="M355.66 11.354c13.793-13.805 36.208-13.805 50.001 0 13.785 13.804 13.785 36.238 0 50.034L201.22 266l204.442 204.61c13.785 13.805 13.785 36.239 0 50.044-13.793 13.796-36.208 13.796-50.002 0a5994246.277 5994246.277 0 0 0-229.332-229.454 35.065 35.065 0 0 1-10.326-25.126c0-9.2 3.393-18.26 10.326-25.2C172.192 194.973 332.731 34.31 355.66 11.354Z"
				/>
			</svg>
			{children}
		</button>
	);
};

export const NextButton: React.FC<PropType> = ({
	size = "default",
	children,
	disabled,
	...restProps
}) => {
	const sizeClasses =
		size === "small" ? "w-[2.7rem] h-[2.7rem]" : "w-[3.6rem] h-[3.6rem]";

	return (
		<button
			className={`embla__button embla__button--next z-[1] m-0 flex cursor-pointer items-center justify-center rounded-full border-2 border-input bg-transparent p-0 text-foreground no-underline transition-standard ${sizeClasses}`}
			type="button"
			disabled={disabled}
			{...restProps}
		>
			<svg className="h-[35%] w-[35%]" viewBox="0 0 532 532">
				<title>Next slide</title>
				<path
					fill="currentColor"
					d="M176.34 520.646c-13.793 13.805-36.208 13.805-50.001 0-13.785-13.804-13.785-36.238 0-50.034L330.78 266 126.34 61.391c-13.785-13.805-13.785-36.239 0-50.044 13.793-13.796 36.208-13.796 50.002 0 22.928 22.947 206.395 206.507 229.332 229.454a35.065 35.065 0 0 1 10.326 25.126c0 9.2-3.393 18.26-10.326 25.2-45.865 45.901-206.404 206.564-229.332 229.52Z"
				/>
			</svg>
			{children}
		</button>
	);
};

type EmblaArrowButtonsProps = {
	emblaApi: UseEmblaCarouselType[1] | undefined;
	className?: string;
	variant?: "default" | "grid";
	size?: "default" | "small";
};

/**
 * Standardized arrow buttons component for Embla carousels
 * Used across product sliders, testimonials, and image galleries
 */
export function EmblaArrowButtons({
	emblaApi,
	className = "",
	variant = "default",
	size = "default",
}: EmblaArrowButtonsProps) {
	const {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick,
	} = usePrevNextButtons(emblaApi);

	const containerClass =
		variant === "grid"
			? size === "small"
				? "grid grid-cols-2 gap-1.5 items-center flex-shrink-0"
				: "grid grid-cols-2 gap-2.5 items-center flex-shrink-0"
			: "embla__buttons";

	return (
		<div className={`${containerClass} ${className}`}>
			<PrevButton
				onClick={onPrevButtonClick}
				disabled={prevBtnDisabled}
				size={size}
			/>
			<NextButton
				onClick={onNextButtonClick}
				disabled={nextBtnDisabled}
				size={size}
			/>
		</div>
	);
}
