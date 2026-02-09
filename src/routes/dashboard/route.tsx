import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Toaster } from "~/components/ui/shared/sonner";
import { userDataQueryOptions } from "~/lib/queryOptions";
import { simpleSearchSchema } from "~/utils/searchSchemas";

export const Route = createFileRoute("/dashboard")({
	// Auth guard: reads from React Query cache first (populated by root loader),
	// only hits the server on cache miss. Eliminates the redundant getUserData()
	// round-trip that was happening on every dashboard navigation.
	beforeLoad: async ({ context: { queryClient } }) => {
		try {
			const userData =
				queryClient.getQueryData(userDataQueryOptions().queryKey) ??
				(await queryClient.ensureQueryData(userDataQueryOptions()));

			if (!userData || !userData.isAdmin) {
				throw redirect({ to: "/login" });
			}

			if (!userData.userID || !userData.userEmail) {
				throw redirect({ to: "/login" });
			}

			return { userData };
		} catch (error) {
			// Re-throw redirects as-is
			if (error && typeof error === "object" && "to" in error) {
				throw error;
			}
			throw redirect({ to: "/login" });
		}
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
