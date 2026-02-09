import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/news")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
