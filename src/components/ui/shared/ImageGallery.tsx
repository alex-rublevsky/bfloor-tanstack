import { cva, type VariantProps } from "class-variance-authority";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Image } from "~/components/ui/shared/Image";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { EmblaArrowButtons } from "./EmblaArrowButtons";
import { EmblaDotButtons } from "./EmblaDotButtons";
import "./image-gallery.css";

const mainImageVariants = cva(
	"max-w-full w-full lg:w-auto object-contain rounded-none lg:rounded-lg relative z-2",
	{
		variants: {
			size: {
				default: "max-h-[calc(100vh-5rem)]",
				compact: "max-h-[70vh]",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

interface ImageGalleryProps extends VariantProps<typeof mainImageVariants> {
	images: string[];
	alt: string;
	className?: string;
	productSlug?: string;
	viewTransitionName?: string;
	initialImageIndex?: number; // Which image to show initially (for view transitions)
}

export default function ImageGallery({
	images,
	alt,
	className = "",
	size,
	productSlug,
	viewTransitionName,
	initialImageIndex = 0,
}: ImageGalleryProps) {
	// Determine the view transition name
	const transitionName = viewTransitionName || `product-image-${productSlug}`;

	// Track current image index for mobile
	const [mobileSelectedIndex, setMobileSelectedIndex] =
		useState(initialImageIndex);

	// Desktop carousel (full-width, ~70% height, loop with snap)
	// Images are edge-to-edge, full height, auto width (maintains aspect ratio)
	// Snap behavior aligns leftmost visible image to left edge when scrolling
	const [emblaMainRef, emblaMainApi] = useEmblaCarousel(
		{
			loop: true,
			align: "start",
		},
		[],
	);

	// Mobile carousel (main image)
	const [emblaMobileRef, emblaMobileApi] = useEmblaCarousel(
		{
			loop: false,
			align: "center",
		},
		[],
	);

	// Mobile thumbnails carousel
	const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel(
		{
			containScroll: "keepSnaps",
			dragFree: true,
		},
		[],
	);

	// Desktop navigation - handled by EmblaArrowButtons and EmblaDotButtons components

	// Sync mobile thumbnails with main carousel
	const onThumbClick = useCallback(
		(index: number) => {
			if (!emblaMobileApi || !emblaThumbsApi) return;
			emblaMobileApi.scrollTo(index);
		},
		[emblaMobileApi, emblaThumbsApi],
	);

	const onMobileSelect = useCallback(() => {
		if (!emblaMobileApi || !emblaThumbsApi) return;
		const index = emblaMobileApi.selectedScrollSnap();
		setMobileSelectedIndex(index);
		emblaThumbsApi.scrollTo(index);
	}, [emblaMobileApi, emblaThumbsApi]);

	useEffect(() => {
		if (!emblaMobileApi) return;
		onMobileSelect();
		emblaMobileApi.on("select", onMobileSelect).on("reInit", onMobileSelect);
	}, [emblaMobileApi, onMobileSelect]);

	// Scroll to initial image index on mount
	useEffect(() => {
		if (
			emblaMainApi &&
			initialImageIndex >= 0 &&
			initialImageIndex < images.length
		) {
			emblaMainApi.scrollTo(initialImageIndex, true); // true = instant, no animation
		}
		if (
			emblaMobileApi &&
			initialImageIndex >= 0 &&
			initialImageIndex < images.length
		) {
			emblaMobileApi.scrollTo(initialImageIndex, true);
			setMobileSelectedIndex(initialImageIndex);
		}
	}, [emblaMainApi, emblaMobileApi, initialImageIndex, images.length]);

	if (!images.length) {
		return (
			<div className="relative flex h-[75vh] w-full items-center justify-center rounded-lg bg-muted">
				<div
					style={{
						viewTransitionName: transitionName,
						opacity: 0,
						position: "absolute",
					}}
					className="h-1 w-1"
				/>
				<p className="text-muted-foreground">No images available</p>
			</div>
		);
	}

	// Single image - simplified layout
	if (images.length === 1) {
		return (
			<div className={`w-full ${className}`}>
				{/* Desktop: Single image */}
				<div className="relative hidden w-full lg:block">
					<div className="h-[70vh] min-h-[500px] w-full overflow-hidden">
						<div className="flex h-full touch-pan-y touch-pinch-zoom gap-0">
							<div className="relative m-0 flex h-full min-w-0 flex-shrink-0 items-center justify-center p-0">
								<img
									src={`${ASSETS_BASE_URL}/${images[0]}`}
									alt={alt}
									width={3000}
									height={3000}
									loading="eager"
									className="block h-full w-auto rounded-none object-contain object-center"
									style={{ viewTransitionName: transitionName }}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Mobile: Single image */}
				<div className="lg:hidden">
					<div className="relative aspect-[4/3] max-h-[50vh] w-full">
						<img
							src={`${ASSETS_BASE_URL}/${images[0]}`}
							alt={alt}
							width={3000}
							height={3000}
							loading="eager"
							className={`${mainImageVariants({ size })} block`}
							style={{ viewTransitionName: transitionName }}
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`w-full ${className}`}>
			{/* Desktop: Full-width carousel */}
			<div className="relative hidden w-full lg:block">
				<div
					className="h-[70vh] min-h-[500px] w-full overflow-hidden"
					ref={emblaMainRef}
				>
					<div className="flex h-full touch-pan-y touch-pinch-zoom gap-0">
						{images.map((image, index) => (
							<div
								key={image}
								className="relative m-0 flex h-full min-w-0 flex-shrink-0 items-center justify-center p-0"
							>
								<img
									src={`${ASSETS_BASE_URL}/${image}`}
									alt={`${alt} ${index + 1}`}
									width={3000}
									height={3000}
									loading={index === 0 ? "eager" : "lazy"}
									className="block h-full w-auto rounded-none object-contain object-center"
									style={{
										viewTransitionName:
											index === initialImageIndex ? transitionName : undefined,
									}}
								/>
							</div>
						))}
					</div>
				</div>

				{/* Desktop Navigation Controls */}
				<div className="flex flex-row items-center justify-start gap-6 py-6 pl-4">
					<EmblaArrowButtons
						emblaApi={emblaMainApi}
						variant="grid"
						size="small"
					/>

					<EmblaDotButtons
						emblaApi={emblaMainApi}
						itemKey={(index) => images[index]}
						size="small"
					/>
				</div>
			</div>

			{/* Mobile: Square main image with thumbnails */}
			<div className="w-full lg:hidden">
				{/* Main image carousel - edge-to-edge */}
				<div className="relative aspect-[4/3] max-h-[50vh] w-full">
					<div className="h-full w-full overflow-hidden" ref={emblaMobileRef}>
						<div className="flex h-full touch-pan-y touch-pinch-zoom">
							{images.map((image, index) => (
								<div
									key={image}
									className="relative flex h-full w-full min-w-0 flex-shrink-0 items-center justify-center"
								>
									<div className="flex h-full w-full items-center justify-center">
										<Image
											src={`${ASSETS_BASE_URL}/${image}`}
											alt={`${alt} main image ${index + 1}`}
											width={3000}
											height={3000}
											className={mainImageVariants({ size })}
											style={{
												maxHeight: "100%",
												width: "auto",
												objectFit: "contain",
												viewTransitionName:
													index === initialImageIndex
														? transitionName
														: undefined,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Thumbnails - edge-to-edge with left padding for first item */}
				<div className="mt-2">
					<div className="w-full overflow-hidden" ref={emblaThumbsRef}>
						<div className="flex gap-2 py-2 pl-3">
							{images.map((image, index) => {
								const isSelected = mobileSelectedIndex === index;
								return (
									<button
										key={image}
										type="button"
										aria-label={`View image ${index + 1}`}
										className={`image-gallery-mobile__thumb relative m-0 h-24 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-sm border-2 bg-transparent p-0 transition-standard sm:h-20 sm:w-20 ${
											isSelected
												? "border-primary"
												: "border-transparent hover:border-primary"
										}`}
										style={{
											viewTransitionName: `gallery-thumb-${productSlug}-${index}`,
										}}
										onClick={() => onThumbClick(index)}
									>
										<div className="absolute inset-0 h-full w-full">
											<Image
												src={`${ASSETS_BASE_URL}/${image}`}
												alt={`${alt} thumbnail ${index + 1}`}
												className="h-full w-full rounded-none object-cover"
											/>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
