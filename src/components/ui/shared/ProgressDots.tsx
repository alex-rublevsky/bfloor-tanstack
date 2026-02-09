import type { UseEmblaCarouselType } from "embla-carousel-react";
import { useCallback } from "react";
import { useDotButton } from "./EmblaDotButtons";
import "./progress-dots.css";

// ---------------------------------------------------------------------------
// SVG geometry — sized to match testimonial dots (~1.2rem inner, ~2.6rem outer)
// ---------------------------------------------------------------------------
const SVG = 42; // viewBox + rendered size
const CENTER = SVG / 2;
const DOT_R = 9; // inner filled‑dot radius  (≈ 18 px diameter)
const RING_R = 17; // progress‑ring radius
const CIRC = 2 * Math.PI * RING_R; // ≈ 106.81

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type ProgressDotsProps = {
	emblaApi: UseEmblaCarouselType[1] | undefined;
	/** Autoplay delay in ms — controls the ring animation duration */
	autoplayDelay: number;
	/** Optional key extractor per slide (falls back to index) */
	itemKey?: (index: number) => string | number;
};

/**
 * Autoplay progress‑dot indicators for Embla carousels.
 *
 * Each dot shows a filled circle; the *active* dot additionally renders a
 * circular stroke that animates over `autoplayDelay` ms, giving the user a
 * visual cue of when the next slide will appear.
 *
 * Clicking a dot scrolls to that slide **and** restarts the autoplay timer.
 */
export function ProgressDots({
	emblaApi,
	autoplayDelay,
	itemKey,
}: ProgressDotsProps) {
	const { selectedIndex, scrollSnaps, onDotButtonClick } =
		useDotButton(emblaApi);

	// Wrap dot click to also restart the autoplay timer
	const onDotClick = useCallback(
		(index: number) => {
			onDotButtonClick(index);
			const autoplay = emblaApi?.plugins()?.autoplay;
			if (autoplay) {
				autoplay.stop();
				autoplay.play();
			}
		},
		[emblaApi, onDotButtonClick],
	);

	if (scrollSnaps.length <= 1) return null;

	return (
		<div className="progress-dots">
			{scrollSnaps.map((_, index) => {
				const isActive = index === selectedIndex;
				return (
					<button
						key={itemKey ? itemKey(index) : index}
						type="button"
						onClick={() => onDotClick(index)}
						className="progress-dot"
						aria-label={`Перейти к слайду ${index + 1}`}
					>
						<svg
							width={SVG}
							height={SVG}
							viewBox={`0 0 ${SVG} ${SVG}`}
							aria-hidden="true"
						>
							{/* Inner dot */}
							<circle
								cx={CENTER}
								cy={CENTER}
								r={DOT_R}
								className={
									isActive ? "progress-dot__fill--active" : "progress-dot__fill"
								}
							/>

							{/*
							  Progress ring — only rendered on the active dot.
							  `key` includes selectedIndex so React re‑mounts the
							  element on every slide change, restarting the CSS animation.
							*/}
							{isActive && (
								<circle
									key={`ring-${selectedIndex}`}
									cx={CENTER}
									cy={CENTER}
									r={RING_R}
									fill="none"
									strokeWidth={2.5}
									strokeLinecap="round"
									className="progress-dot__ring"
									style={{
										strokeDasharray: CIRC,
										strokeDashoffset: CIRC,
										animationDuration: `${autoplayDelay}ms`,
									}}
								/>
							)}
						</svg>
					</button>
				);
			})}
		</div>
	);
}
