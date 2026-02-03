import { useEffect, useState } from "react";
import type { ButtonStatus } from "~/components/ui/shared/Button";

const EVENT_NAME = "dashboardFormStatus";

/**
 * Dispatch status for the nav "Update product" button (e.g. while saving).
 * Call from the edit page instead of using context.
 */
export function dispatchDashboardFormStatus(status: ButtonStatus): void {
	window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { status } }));
}

/**
 * Subscribe to status updates from the edit page. Use in the NavBar and pass
 * the returned value to the status button. No React context needed.
 */
export function useDashboardFormStatus(): ButtonStatus {
	const [status, setStatus] = useState<ButtonStatus>("idle");

	useEffect(() => {
		const handler = (e: Event) => {
			const { status: next } = (e as CustomEvent<{ status: ButtonStatus }>)
				.detail;
			setStatus(next);
		};
		window.addEventListener(EVENT_NAME, handler);
		return () => window.removeEventListener(EVENT_NAME, handler);
	}, []);

	return status;
}
