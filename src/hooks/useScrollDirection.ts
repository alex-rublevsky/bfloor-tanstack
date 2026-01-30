import { useEffect, useRef, useState } from "react";

/**
 * Detects scroll direction to show/hide navbar
 *
 * @param threshold - Scroll distance before hiding navbar
 * @returns shouldShowNavbar - Whether navbar should be visible
 */
export function useScrollDirection(threshold: number) {
	const [shouldShowNavbar, setShouldShowNavbar] = useState(true);
	const lastScrollY = useRef(0);
	const ticking = useRef(false);
	// Track current navbar state to avoid reading stale state in closure
	const shouldShowNavbarRef = useRef(true);

	// Keep ref in sync with state
	shouldShowNavbarRef.current = shouldShowNavbar;

	useEffect(() => {
		if (typeof window === "undefined") return;

		lastScrollY.current = window.scrollY;

		const updateScrollDirection = () => {
			const currentScrollY = window.scrollY;
			const scrollDiff = currentScrollY - lastScrollY.current;

			// At top: always show
			if (currentScrollY < 10) {
				if (!shouldShowNavbarRef.current) {
					setShouldShowNavbar(true);
				}
				lastScrollY.current = currentScrollY;
				ticking.current = false;
				return;
			}

			// Ignore tiny scroll changes (< 3px) for stability
			if (Math.abs(scrollDiff) < 3) {
				lastScrollY.current = currentScrollY;
				ticking.current = false;
				return;
			}

			// Scrolling down: hide if past threshold
			if (scrollDiff > 0 && currentScrollY > threshold) {
				if (shouldShowNavbarRef.current) {
					setShouldShowNavbar(false);
				}
			}
			// Scrolling up: show (regardless of position)
			else if (scrollDiff < 0) {
				if (!shouldShowNavbarRef.current) {
					setShouldShowNavbar(true);
				}
			}

			lastScrollY.current = currentScrollY;
			ticking.current = false;
		};

		const onScroll = () => {
			if (!ticking.current) {
				window.requestAnimationFrame(updateScrollDirection);
				ticking.current = true;
			}
		};

		updateScrollDirection();
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => window.removeEventListener("scroll", onScroll);
	}, [threshold]);

	return { shouldShowNavbar };
}
