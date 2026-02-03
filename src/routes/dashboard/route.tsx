import { createFileRoute, Outlet } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Toaster } from "~/components/ui/shared/sonner";
import { userDataQueryOptions } from "~/lib/queryOptions";
import { simpleSearchSchema } from "~/utils/searchSchemas";

export const Route = createFileRoute("/dashboard")({
	// beforeLoad temporarily disabled for local development access
	// beforeLoad: async () => {
	// 	try {
	// 		const userData = await getUserData();

	// 		// Check if user is authenticated and is admin
	// 		if (!userData.isAuthenticated || !userData.isAdmin) {
	// 			throw redirect({ to: "/login" });
	// 		}

	// 		// Ensure we have required user data
	// 		if (!userData.userID || !userData.userEmail) {
	// 			throw redirect({ to: "/login" });
	// 		}

	// 		// Return user data in context for the loader to use
	// 		return { userData };
	// 	} catch {
	// 		throw redirect({ to: "/login" });
	// 	}
	// },
	// Loader prefetches userData for NavBar and other components
	loader: async ({ context }) => {
		const { queryClient } = context;
		// Prefetch userData so NavBar can use it immediately from cache
		await queryClient.ensureQueryData(userDataQueryOptions());
		// Return empty object - data is now in query cache
		return {};
	},
	component: RouteComponent,
	validateSearch: zodValidator(simpleSearchSchema),
});

function DashboardLayout() {
	return (
		<>
			<Outlet />
			<Toaster className="fixed top-4 right-4 z-50" />
		</>
	);
}

function RouteComponent() {
	return <DashboardLayout />;
}
