/// <reference types="vite/client" />

//import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";

import type * as React from "react";
import { memo } from "react";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import { Footer } from "~/components/ui/shared/Footer";
import { NavBar } from "~/components/ui/shared/NavBar";
import { Toaster } from "~/components/ui/shared/sonner";
import { CartProvider } from "~/lib/cartContext";
import { ClientSearchProvider } from "~/lib/clientSearchContext";
import { userDataQueryOptions } from "~/lib/queryOptions";
import { seo } from "~/utils/seo";
import appCss from "../styles/app.css?url";

// Create QueryClient with optimized defaults
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep data in cache
			staleTime: 1000 * 60 * 60 * 24, // 24 hours - consider data fresh
		},
	},
});

export const Route = createRootRoute({
	loader: async ({ context: { queryClient } }) => {
		// Prefetch userData at root level - cached once for all routes
		await queryClient.ensureQueryData(userDataQueryOptions());
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({
				title: "BeautyFloor",
				description: `Напольные покрытия во Владивостоке`,
			}),
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "preload",
				href: "/fonts/OverusedGrotesk-VF.woff2",
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "96x96",
				href: "/favicon-96x96.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon-16x16.png",
			},
			{ rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	errorComponent: (props) => {
		return <DefaultCatchBoundary {...props} />;
	},
	notFoundComponent: () => <NotFound />,
	component: RootComponent,
	context: () => ({
		queryClient,
	}),
});

function RootComponent() {
	return (
		<QueryClientProvider client={queryClient}>
			<CartProvider>
				<ClientSearchProvider>
					<RootDocument>
						<Outlet />
					</RootDocument>
				</ClientSearchProvider>
			</CartProvider>
		</QueryClientProvider>
	);
}

// Memoized Footer component to prevent re-renders
const MemoizedFooter = memo(Footer);
MemoizedFooter.displayName = "MemoizedFooter";

function RootDocument({ children }: { children: React.ReactNode }) {
	// Only subscribe to pathname changes, not all router state
	// This prevents re-renders when Link preload triggers on hover
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	// Simple computed values - no need to memoize these cheap operations
	const isStore = pathname.startsWith("/store");
	const isDashboard = pathname.startsWith("/dashboard");
	const isLogin = pathname === "/login";
	const isHome = pathname === "/";

	return (
		<html
			lang="en"
			className={`${isHome ? "scroll-smooth" : ""} bg-background`}
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body className={"flex min-h-screen flex-col"} suppressHydrationWarning>
				<NavBar />

				<main className="flex min-h-0 flex-1 flex-col">{children}</main>
				{!isStore && !isDashboard && !isLogin && <MemoizedFooter />}
				<Toaster className="fixed top-4 right-4 z-50" />
				{/* <TanStackRouterDevtools position="bottom-right" /> */}
				<Scripts />
				{/* <Analytics /> */}
			</body>
		</html>
	);
}
