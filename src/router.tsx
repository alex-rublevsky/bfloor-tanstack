import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import { routeTree } from "./routeTree.gen";
import { incrementProductView } from "./server_functions/store/incrementProductView";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		defaultPreload: "intent",
		context: {},
		scrollRestoration: true,
		defaultStructuralSharing: true, //TODO: what is this?
		defaultPreloadStaleTime: 0,
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
		Sentry.init({
			dsn: "https://2329b254512d6d56a4ab76bfb7868c4d@o4510799912108032.ingest.us.sentry.io/4510800437968896",

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
