import type { UseEmblaCarouselType } from "embla-carousel-react";
import type React from "react";
import {
	type ComponentPropsWithRef,
	useCallback,
	useEffect,
	useState,
} from "react";

type UseDotButtonType = {
	selectedIndex: number;
	scrollSnaps: number[];
	onDotButtonClick: (index: number) => void;
};

export const useDotButton = (
	emblaApi: UseEmblaCarouselType[1] | undefined,
): UseDotButtonType => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const onDotButtonClick = useCallback(
		(index: number) => {
			if (!emblaApi) return;
			emblaApi.scrollTo(index);
		},
		[emblaApi],
	);

	const onInit = useCallback((emblaApi: UseEmblaCarouselType[1]) => {
		if (!emblaApi) return;
		setScrollSnaps(emblaApi.scrollSnapList());
	}, []);

	const onSelect = useCallback((emblaApi: UseEmblaCarouselType[1]) => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
	}, []);

	useEffect(() => {
		if (!emblaApi) return;

		onInit(emblaApi);
		onSelect(emblaApi);
		emblaApi.on("reInit", onInit).on("reInit", onSelect).on("select", onSelect);
	}, [emblaApi, onInit, onSelect]);

	return {
		selectedIndex,
		scrollSnaps,
		onDotButtonClick,
	};
};

type PropType = ComponentPropsWithRef<"button"> & {
	size?: "default" | "small";
};

export const DotButton: React.FC<PropType> = ({
	size = "default",
	children,
	className = "",
	...restProps
}) => {
	const sizeClasses =
		size === "small"
			? "w-[1.8rem] h-[1.8rem] embla__dot--small"
			: "w-[2.6rem] h-[2.6rem]";

	return (
		<button
			type="button"
			className={`embla__dot m-0 flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 no-underline transition-standard ${sizeClasses} ${className}`}
			{...restProps}
		>
			{children}
		</button>
	);
};

type EmblaDotButtonsProps = {
	emblaApi: UseEmblaCarouselType[1] | undefined;
	className?: string;
	containerClassName?: string;
	itemKey?: (index: number) => string | number;
	size?: "default" | "small";
};

/**
 * Standardized dot buttons component for Embla carousels
 * Used across product sliders, testimonials, and image galleries
 */
export function EmblaDotButtons({
	emblaApi,
	className = "",
	containerClassName = "",
	itemKey,
	size = "default",
}: EmblaDotButtonsProps) {
	const { selectedIndex, scrollSnaps, onDotButtonClick } =
		useDotButton(emblaApi);

	return (
		<div
			className={`flex flex-wrap items-center justify-start gap-0.5 ${containerClassName}`}
		>
			{scrollSnaps.map((_, index) => (
				<DotButton
					key={itemKey ? itemKey(index) : index}
					onClick={() => onDotButtonClick(index)}
					className={`${index === selectedIndex ? "embla__dot--selected" : ""} ${className}`}
					size={size}
				/>
			))}
		</div>
	);
}
