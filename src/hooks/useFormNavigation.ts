import type { UseNavigateResult } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Hook to handle navigation bar button clicks for product forms
 * Extracted to avoid duplication between create & edit pages
 */
export function useFormNavigation(
	formId: string,
	navigate: UseNavigateResult<string>,
	onCancel?: () => void,
) {
	useEffect(() => {
		const handleFormAction = (e: Event) => {
			const customEvent = e as CustomEvent<{ action: string }>;
			if (customEvent.detail?.action === "cancel") {
				if (onCancel) {
					onCancel();
				} else {
					navigate({ to: "/dashboard" });
				}
			} else if (customEvent.detail?.action === "submit") {
				const form = document.getElementById(formId) as HTMLFormElement;
				if (form) {
					form.requestSubmit();
				}
			}
		};

		window.addEventListener("productFormAction", handleFormAction);
		return () =>
			window.removeEventListener("productFormAction", handleFormAction);
	}, [formId, navigate, onCancel]);
}
