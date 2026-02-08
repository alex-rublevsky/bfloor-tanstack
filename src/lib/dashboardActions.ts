/**
 * Lightweight external store for dashboard action buttons and form status.
 *
 * Uses React's built-in useSyncExternalStore — no Provider needed.
 * Pages call the plain setter functions; NavBar/BottomNavBar subscribe via hooks.
 *
 * Why not React context?
 *   NavBar lives at the root layout level while dashboard pages are nested
 *   inside the /dashboard route. A context provider in the dashboard layout
 *   can never reach the NavBar. An external store sidesteps tree-placement
 *   issues entirely — any component can read or write regardless of nesting.
 */

import { useSyncExternalStore } from "react";
import type { ButtonStatus } from "~/components/ui/shared/Button";

// ── Types ────────────────────────────────────────────────────────────────────

export type ActionButtonConfig = {
	label: string;
	onClick: () => void;
	variant: "default" | "outline";
	/** Use animated status button (idle/analyzing/success/warning) */
	useStatusButton?: boolean;
	/** Labels for status suffix when useStatusButton is true */
	statusLabels?: {
		noChanges?: string;
		analyzing?: string;
		success?: string;
		warning?: string;
	};
};

// ── Internal store ───────────────────────────────────────────────────────────

let _buttons: ActionButtonConfig[] = [];
let _formStatus: ButtonStatus = "idle";
const _listeners = new Set<() => void>();

function emit() {
	for (const fn of _listeners) fn();
}

function subscribe(listener: () => void) {
	_listeners.add(listener);
	return () => {
		_listeners.delete(listener);
	};
}

// ── Write API (called by pages — plain functions, no hooks) ──────────────────

export function setDashboardButtons(next: ActionButtonConfig[]) {
	_buttons = next;
	emit();
}

export function setDashboardFormStatus(next: ButtonStatus) {
	_formStatus = next;
	emit();
}

// ── Read API (called by NavBar / BottomNavBar — hooks with subscriptions) ────

/** SSR-safe empty snapshot (stable reference) */
const EMPTY_BUTTONS: ActionButtonConfig[] = [];

export function useDashboardButtons(): ActionButtonConfig[] {
	return useSyncExternalStore(
		subscribe,
		() => _buttons,
		() => EMPTY_BUTTONS,
	);
}

export function useDashboardFormStatus(): ButtonStatus {
	return useSyncExternalStore(
		subscribe,
		() => _formStatus,
		() => "idle",
	);
}
