import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "~/components/ui/shared/Link";
import { ASSETS_BASE_URL } from "~/constants/urls";

type EmblaOptionsType = Parameters<typeof useEmblaCarousel>[0];

// Autoplay delay — 2× slower than news carousel (5 000 ms)
const AUTOPLAY_DELAY = 10_000;

type SlideImage = {
	desktop: string;
	mobile: string;
	url?: string;
};

type EmblaPropType = {
	slides: SlideImage[];
	options?: EmblaOptionsType;
};

// ---------------------------------------------------------------------------
// Thumb with progress line
// ---------------------------------------------------------------------------
const Thumb: React.FC<{
	selected: boolean;
	index: number;
	onClick: () => void;
	src: string;
}> = ({ selected, index, onClick, src }) => (
	<div
		className={"embla-thumbs__slide".concat(
			// biome-ignore lint/nursery/useSortedClasses: Dynamic class concatenation requires space before modifier class
			selected ? " embla-thumbs__slide--selected" : "",
		)}
	>
		<button
			onClick={onClick}
			type="button"
			className="embla-thumbs__slide__button aspect-3/2"
			aria-label={`Go to slide ${index + 1}`}
		>
			<img
				src={src}
				alt={`thumb ${index + 1}`}
				className="embla-thumbs__slide__image"
			/>

			{/* Progress line — bottom-aligned, only animates on the active thumb */}
			{selected && (
				<span
					key={`bar-${index}`}
					className="banner-thumb__progress"
					style={{ animationDuration: `${AUTOPLAY_DELAY}ms` }}
				/>
			)}
		</button>
	</div>
);

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------
const EmblaCarousel: React.FC<EmblaPropType> = ({ slides, options }) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const [emblaMainRef, emblaMainApi] = useEmblaCarousel(options, [
		Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: false }),
	]);

	const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
		containScroll: "keepSnaps",
		dragFree: true,
	});

	const onThumbClick = useCallback(
		(index: number) => {
			if (!emblaMainApi || !emblaThumbsApi) return;
			emblaMainApi.scrollTo(index);
			// Reset autoplay timer so progress bar restarts in sync
			const autoplay = emblaMainApi.plugins()?.autoplay;
			if (autoplay) {
				if (typeof autoplay.reset === "function") {
					autoplay.reset();
				} else {
					autoplay.stop();
					autoplay.play();
				}
			}
		},
		[emblaMainApi, emblaThumbsApi],
	);

	const onSelect = useCallback(() => {
		if (!emblaMainApi || !emblaThumbsApi) return;
		setSelectedIndex(emblaMainApi.selectedScrollSnap());
		emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
	}, [emblaMainApi, emblaThumbsApi]);

	useEffect(() => {
		if (!emblaMainApi) return;
		onSelect();
		emblaMainApi.on("select", onSelect).on("reInit", onSelect);

		// Safety: ensure autoplay is playing (required by v9+, harmless for v8)
		const autoplay = emblaMainApi.plugins()?.autoplay;
		if (autoplay && typeof autoplay.play === "function") {
			autoplay.play();
		}
	}, [emblaMainApi, onSelect]);

	return (
		<section className="no-padding pb-12">
			<div className="embla">
				{/* Main viewport */}
				<div className="embla__viewport" ref={emblaMainRef}>
					<div className="embla__container">
						{slides.map((slide, index) => (
							<div className="embla__slide" key={slide.desktop}>
								<div className="embla__slide__number">
									{slide.url ? (
										<Link
											href={slide.url}
											disableAnimation
											className="block h-full w-full no-underline hover:no-underline"
										>
											<picture>
												<source
													media="(min-width: 768px)"
													srcSet={slide.desktop}
												/>
												<img
													src={slide.mobile}
													alt={`banner ${index + 1}`}
													className="embla__slide__image"
												/>
											</picture>
										</Link>
									) : (
										<picture>
											<source
												media="(min-width: 768px)"
												srcSet={slide.desktop}
											/>
											<img
												src={slide.mobile}
												alt={`banner ${index + 1}`}
												className="embla__slide__image"
											/>
										</picture>
									)}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Thumbnails */}
				<div className="embla-thumbs">
					<div className="embla-thumbs__viewport" ref={emblaThumbsRef}>
						<div className="embla-thumbs__container flex">
							{slides.map((slide, index) => (
								<Thumb
									key={`thumb-${slide.desktop}`}
									onClick={() => onThumbClick(index)}
									selected={index === selectedIndex}
									index={index}
									src={slide.mobile}
								/>
							))}
						</div>
					</div>
				</div>

				<style>{`
.embla {
	margin: auto;
	--slide-height: 19rem;
	--slide-spacing: 1rem;
	--slide-size: 100%;
	--thumbs-gap: 0.75rem;
}
.embla__viewport {
	overflow: hidden;
	margin-bottom: 0;
}
.embla__container {
	display: flex;
	touch-action: pan-y pinch-zoom;
	margin-left: calc(var(--slide-spacing) * -1);
	margin-bottom: 0;
}
.embla__slide {
	transform: translate3d(0, 0, 0);
	flex: 0 0 var(--slide-size);
	min-width: 0;
	padding-left: var(--slide-spacing);
}
.embla__slide__number {
	box-shadow: inset 0 0 0 0.2rem var(--detail-medium-contrast);
	overflow: hidden;
	user-select: none;
	position: relative;
	width: 100%;
	height: auto;
	border-radius: 0;
}
.embla__slide__number picture {
	display: block;
	width: auto;
	height: auto;
	border-radius: 0;
}
.embla__slide__image {
	width: auto;
	height: auto;
	min-width: 100%;
	display: block;
	object-position: left bottom;
	border-radius: 0;
}
@media (max-width: 767px) {
	.embla__slide__number {
		width: 100%;
		height: auto;
	}
	.embla__slide__number picture {
		width: 100%;
		height: auto;
		display: block;
	}
	.embla__slide__image {
		width: 100%;
		height: auto;
		display: block;
		object-fit: contain;
		object-position: center;
	}
}
@media (min-width: 768px) and (max-width: 1023px) {
	.embla__slide__number {
		width: 100%;
		height: auto;
		max-height: 300px;
	}
	.embla__slide__number picture {
		width: 100%;
		height: auto;
		display: block;
		max-height: 300px;
	}
	.embla__slide__image {
		width: 100%;
		height: auto;
		display: block;
		object-fit: contain;
		object-position: center;
		max-height: 300px;
	}
}
@media (min-width: 1024px) and (max-width: 1399px) {
	.embla__slide__number {
		width: 100%;
		height: auto;
		max-height: 600px;
	}
	.embla__slide__number picture {
		width: 100%;
		height: auto;
		display: block;
		max-height: 600px;
	}
	.embla__slide__image {
		width: 100%;
		height: auto;
		display: block;
		object-fit: contain;
		object-position: center;
		max-height: 600px;
	}
}
@media (min-width: 1400px) {
	.embla__slide__number {
		width: 100%;
		height: auto;
		max-height: 700px;
		display: block;
	}
	.embla__slide__number picture {
		width: 100%;
		height: auto;
		display: block;
		max-height: 700px;
	}
	.embla__slide__image {
		width: 100%;
		height: auto;
		display: block;
		object-fit: contain;
		object-position: center;
		max-height: 700px;
	}
}
.embla-thumbs {
	--thumbs-slide-spacing: 0.6rem;
	--thumbs-slide-height: 3.6rem;
	--thumbs-gap-between: 0.5rem;
	margin-top: 0.5rem;
	margin-bottom: 0;
}
@media (min-width: 768px) {
	.embla-thumbs {
		--thumbs-slide-spacing: 0.8rem;
		--thumbs-slide-height: 4.8rem;
		--thumbs-gap-between: 0.75rem;
		margin-top: 0.75rem;
	}
}
.embla-thumbs__viewport {
	overflow: hidden;
}
.embla-thumbs__container {
	gap: var(--thumbs-gap-between);
}
.embla-thumbs__slide {
	flex: 0 0 auto;
	min-width: 0;
}
.embla-thumbs__slide:first-child {
	padding-left: var(--thumbs-slide-spacing);
}
@media (min-width: 576px) {
	.embla-thumbs__slide {
		flex: 0 0 auto;
	}
}
.embla-thumbs__slide__button {
	border-radius: var(--radius-sm);
	-webkit-tap-highlight-color: rgba(var(--text-high-contrast-rgb-value), 0.5);
	-webkit-appearance: none;
	appearance: none;
	background-color: transparent;
	touch-action: manipulation;
	display: flex;
	align-items: flex-end;
	justify-content: flex-start;
	text-decoration: none;
	cursor: pointer;
	border: 3px solid transparent;
	padding: 0;
	margin: 0;
	box-shadow: inset 0 0 0 0.2rem var(--detail-medium-contrast);
	height: var(--thumbs-slide-height);
	overflow: hidden;
	transition: var(--transition-standard);
	box-sizing: border-box;
	position: relative;
}
.embla-thumbs__slide__image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	border-radius: 0;
	object-position: left bottom;
}
.embla-thumbs__slide--selected .embla-thumbs__slide__button {
	border-color: var(--accent);
}

/* ── Banner thumb progress line ── */
@keyframes banner-thumb-fill {
	from { transform: scaleX(0); }
	to   { transform: scaleX(1); }
}

.banner-thumb__progress {
	position: absolute;
	inset-inline: 0;
	bottom: 0;
	height: 3px;
	background: var(--accent);
	transform-origin: left;
	transform: scaleX(0);
	animation: banner-thumb-fill linear forwards;
	/* animation-duration set via inline style */
	pointer-events: none;
}
`}</style>
			</div>
		</section>
	);
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export function Banner() {
	const SLIDES: SlideImage[] = [
		{
			desktop: `${ASSETS_BASE_URL}/banners/elochka.webp`,
			mobile: `${ASSETS_BASE_URL}/banners/elochka-mobile.webp`,
			// TODO: make it elochka
			url: "/store/laminate",
		},
		{
			desktop: `${ASSETS_BASE_URL}/banners/cork.webp`,
			mobile: `${ASSETS_BASE_URL}/banners/cork-mobile.webp`,
			//TODO: add url
		},
	];
	const OPTIONS: EmblaOptionsType = { loop: true };

	return <EmblaCarousel slides={SLIDES} options={OPTIONS} />;
}
