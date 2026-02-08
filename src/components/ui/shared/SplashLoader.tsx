import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { PRODUCT_TAGS } from "~/constants/units";
import { Logo } from "./Logo";

const MIN_DISPLAY = 100; // ms — minimum splash display time
const MAX_WAIT = 10000; // ms — absolute max wait for any async prerequisite

/** Wait until all banner carousel images have loaded (or errored).
 *  Resolves immediately if no banner images exist (non-home pages). */
function waitForBannerImages(): Promise<void> {
	return new Promise((resolve) => {
		const images = document.querySelectorAll<HTMLImageElement>(
			".embla__slide__image",
		);
		if (images.length === 0) {
			resolve();
			return;
		}

		let remaining = images.length;
		const onDone = () => {
			remaining--;
			if (remaining <= 0) resolve();
		};

		for (const img of images) {
			if (img.complete) {
				onDone();
			} else {
				img.addEventListener("load", onDone, { once: true });
				img.addEventListener("error", onDone, { once: true });
			}
		}
	});
}

/** Wait until the first 1-2 product gallery images have loaded.
 *  The images only appear in the DOM after the route loader resolves and
 *  the actual ProductPage component renders (replacing the skeleton),
 *  so we first poll for .vt-image elements to exist, then wait for load. */
function waitForProductImages(signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const waitForLoad = (images: HTMLImageElement[]) => {
			let remaining = images.length;
			const onDone = () => {
				remaining--;
				if (remaining <= 0) resolve();
			};

			for (const img of images) {
				if (img.complete) {
					onDone();
				} else {
					img.addEventListener("load", onDone, { once: true });
					img.addEventListener("error", onDone, { once: true });
				}
			}
		};

		// Poll until .vt-image elements appear (they don't exist during skeleton)
		const poll = () => {
			if (signal.aborted) {
				resolve();
				return;
			}

			const found = document.querySelectorAll<HTMLImageElement>(".vt-image");
			if (found.length > 0) {
				waitForLoad(Array.from(found).slice(0, 2));
				return;
			}

			requestAnimationFrame(poll);
		};
		poll();
	});
}

/** Wait until critical query data is in the TanStack Query cache.
 *  These are SSR-prefetched in route loaders, so this typically resolves
 *  on the very first check — the polling is just a safety net.
 *  Accepts an AbortSignal to stop the rAF loop when the outer race resolves. */
function waitForCriticalData(
	queryClient: QueryClient,
	signal: AbortSignal,
): Promise<void> {
	return new Promise((resolve) => {
		const check = () => {
			if (signal.aborted) {
				resolve();
				return;
			}

			const categoryCounts = queryClient.getQueryData([
				"productCategoryCounts",
			]);
			const firstTagProducts = queryClient.getQueryData([
				"bfloorProductsByTagInfinite",
				PRODUCT_TAGS[0],
			]);

			if (categoryCounts && firstTagProducts) {
				resolve();
				return;
			}

			// Data not cached yet — re-check on next frame
			requestAnimationFrame(check);
		};
		check();
	});
}

/** Find the first *visible* `[data-navbar-logo]` element.
 *  Multiple exist for different breakpoints (desktop, tablet, mobile home);
 *  hidden ones (display:none via responsive CSS) have zero dimensions. */
function findVisibleNavbarLogo(): HTMLElement | null {
	for (const el of document.querySelectorAll("[data-navbar-logo]")) {
		const htmlEl = el as HTMLElement;
		if (
			htmlEl.offsetWidth ||
			htmlEl.offsetHeight ||
			htmlEl.getClientRects().length
		) {
			return htmlEl;
		}
	}
	return null;
}

export function SplashLoader() {
	const [visible, setVisible] = useState(true);
	const queryClient = useQueryClient();

	useEffect(() => {
		// Lock body scroll while splash is visible — prevents accidental scrolling
		// behind the fixed overlay (especially on mobile touch)
		document.documentElement.style.overflow = "hidden";

		const abort = new AbortController();
		const start = performance.now();

		const dismiss = async () => {
			const pathname = window.location.pathname;
			const isHome = pathname === "/";
			const isProduct = pathname.startsWith("/product/");

			// Wait for page-specific above-the-fold content before revealing.
			// Each page type has different critical resources; non-matching pages
			// skip straight to the min-display check.
			if (isHome) {
				await Promise.race([
					Promise.all([
						waitForBannerImages(),
						waitForCriticalData(queryClient, abort.signal),
					]),
					new Promise((r) => setTimeout(r, MAX_WAIT)),
				]);
				abort.abort();
			} else if (isProduct) {
				await Promise.race([
					waitForProductImages(abort.signal),
					new Promise((r) => setTimeout(r, MAX_WAIT)),
				]);
				abort.abort();
			}

			// Ensure splash was shown for at least MIN_DISPLAY ms
			const elapsed = performance.now() - start;
			const remaining = Math.max(0, MIN_DISPLAY - elapsed);
			if (remaining > 0) {
				await new Promise((r) => setTimeout(r, remaining));
			}

			// Unlock scroll and ensure viewport is at top before capturing new state
			document.documentElement.style.overflow = "";
			window.scrollTo({ top: 0, behavior: "instant" });

			// Locate morph targets
			const navLogo = findVisibleNavbarLogo();
			const nav = document.querySelector("[data-persist-nav]") as HTMLElement;

			if (!document.startViewTransition || !navLogo) {
				// Fallback: remove splash without animation
				setVisible(false);
				return;
			}

			// Temporarily remove --persist-nav to prevent z-index conflict
			if (nav) nav.style.viewTransitionName = "none";

			// Suppress every other view-transition-name in the DOM so all page
			// content is captured inside the root snapshot group.  Without this,
			// named elements (product card images/names/prices, about-section,
			// etc.) are "cut out" of the root — leaving holes in the splash
			// background — and rendered as independent layers that can peek
			// through before the splash finishes fading.
			const suppressedVtNames: { el: HTMLElement; name: string }[] = [];
			for (const el of document.querySelectorAll<HTMLElement>("[style]")) {
				const vtn = el.style.viewTransitionName;
				if (
					vtn &&
					vtn !== "none" &&
					vtn !== "" &&
					vtn !== "site-logo" &&
					el !== nav
				) {
					suppressedVtNames.push({ el, name: vtn });
					el.style.viewTransitionName = "none";
				}
			}

			// Scope CSS so the delayed background fade only affects this transition
			document.documentElement.classList.add("splash-dismissing");

			const transition = document.startViewTransition(() => {
				flushSync(() => setVisible(false));
				navLogo.style.viewTransitionName = "site-logo";
			});

			transition.finished.then(() => {
				navLogo.style.viewTransitionName = "";
				if (nav) nav.style.viewTransitionName = "--persist-nav";
				document.documentElement.classList.remove("splash-dismissing");
				// Restore suppressed names so route transitions work normally
				for (const { el, name } of suppressedVtNames) {
					el.style.viewTransitionName = name;
				}
			});
		};

		dismiss();

		return () => {
			// Safety net: restore scroll if component tears down unexpectedly
			document.documentElement.style.overflow = "";
			abort.abort();
		};
	}, [queryClient]);

	if (!visible) return null;

	return (
		<div className="fixed inset-0 z-99999 flex items-center justify-center bg-background px-6">
			<div className="w-full" style={{ viewTransitionName: "site-logo" }}>
				<Logo responsive className="block h-auto w-full animate-pulse" />
			</div>
		</div>
	);
}
