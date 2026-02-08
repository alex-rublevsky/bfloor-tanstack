import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import { routeTree } from "./routeTree.gen";
import { incrementProductView } from "./server_functions/store/incrementProductView";

export function getRouter() {
	// Wrap document.startViewTransition once at initialization (client-side only)
	// This removes backdrop-filter from product-info-overlay before snapshots
	// this is needed for proper animation of product info card, which has complex interaction of z index relative to the animated image (requires card to have viewtransition name), as well as blur animation.
	if (typeof document !== "undefined") {
		const originalStartViewTransition = document.startViewTransition;

		if (originalStartViewTransition) {
			document.startViewTransition = (callback) => {
				const overlay = document.querySelector(
					".product-info-overlay",
				) as HTMLElement;
				const isLeavingProductPage =
					overlay && !window.location.pathname.startsWith("/product/");

				if (overlay) {
					if (isLeavingProductPage) {
						// When LEAVING product page: remove view-transition-name
						// Element won't participate in transition, avoiding blur artifact
						overlay.style.viewTransitionName = "none";
					} else {
						// When ON product page: remove backdrop-filter before snapshot
						overlay.style.backdropFilter = "none";
						// biome-ignore lint/suspicious/noExplicitAny: webkitBackdropFilter not in TypeScript types
						(overlay.style as any).webkitBackdropFilter = "none";
						overlay.style.background =
							"oklch(from var(--background) l c h / 0.95)";
						void overlay.offsetHeight; // Force reflow
					}
				}

				// Call original
				const transition = originalStartViewTransition.call(document, callback);

				// Restore after transition
				if (overlay) {
					transition.finished.finally(() => {
						overlay.style.viewTransitionName = "";
						overlay.style.backdropFilter = "";
						// biome-ignore lint/suspicious/noExplicitAny: webkitBackdropFilter not in TypeScript types
						(overlay.style as any).webkitBackdropFilter = "";
						overlay.style.background = "";
					});
				}

				return transition;
			};
		}
	}

	const router = createTanStackRouter({
		routeTree,
		defaultPreload: "intent",
		context: {},
		scrollRestoration: true,
		defaultStructuralSharing: true, //TODO: what is this?
		defaultViewTransition: true,
		scrollRestorationBehavior: "instant", // Instant scroll for better UX with virtualized lists and view transitions
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => <NotFound />,
	});

	// Track product views on actual navigation (not prefetch)
	router.subscribe("onResolved", () => {
		const { pathname } = router.state.location;
		const { matches } = router.state;

		// Only track public product pages (exclude dashboard)
		if (
			pathname.startsWith("/dashboard/") ||
			!pathname.startsWith("/product/")
		) {
			return;
		}

		const match = matches.find((m) => m.routeId === "/product/$productId");
		if (!match?.loaderData) return;

		// Extract product ID safely
		const loaderData = match.loaderData;
		if (
			typeof loaderData === "object" &&
			loaderData !== null &&
			"product" in loaderData
		) {
			const productId = (loaderData as { product: { id?: number } }).product
				?.id;
			if (productId) {
				incrementProductView({ data: productId }).catch(() => {
					// Silently fail - view tracking shouldn't break navigation
				});
			}
		}
	});

	// Initialize Sentry on the client side only
	if (!router.isServer) {
		const isDevelopment = import.meta.env.DEV;

		Sentry.init({
			dsn: "https://2329b254512d6d56a4ab76bfb7868c4d@o4510799912108032.ingest.us.sentry.io/4510800437968896",

			// Set environment to distinguish between dev and production
			environment: isDevelopment ? "development" : "production",

			// Enable debug mode in development to see what Sentry is doing
			debug: isDevelopment,

			// Tunnel to avoid ad blockers
			tunnel: "/tunnel",

			// Adds request headers and IP for users
			sendDefaultPii: true,

			integrations: [
				// Performance monitoring
				Sentry.tanstackRouterBrowserTracingIntegration(router),
				// Session Replay
				Sentry.replayIntegration(),
			],

			// Enable logs to be sent to Sentry
			enableLogs: true,

			// Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
			// Adjust this value in production
			tracesSampleRate: 1.0,

			// Capture Replay for 10% of all sessions, plus 100% of sessions with an error
			replaysSessionSampleRate: 0.1,
			replaysOnErrorSampleRate: 1.0,
		});
	}

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
