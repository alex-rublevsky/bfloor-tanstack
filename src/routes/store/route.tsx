import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StorePageSkeleton } from "~/components/ui/store/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/store")({
	component: StoreLayout,
	pendingComponent: StorePageSkeleton,
});

function StoreLayout() {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<div className="min-h-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}
