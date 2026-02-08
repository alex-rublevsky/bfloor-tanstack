import { useDashboardCRUD } from "~/hooks/useDashboardCRUD";
import { useFormHandlers } from "~/hooks/useFormHandlers";

/**
 * All-in-one hook that combines CRUD operations and form handling for dashboard pages.
 * Provides complete state management for create/edit/delete operations.
 *
 * @param initialFormData - Initial state for both create and edit forms
 * @returns Object with all CRUD operations, form handlers, and states
 *
 * @example
 * ```ts
 * const dashboard = useDashboardForm<BrandFormData>({
 *   name: "",
 *   slug: "",
 *   logo: "",
 *   isActive: true,
 * });
 * ```
 */
export function useDashboardForm<T extends object>(initialFormData: T) {
	const crud = useDashboardCRUD();

	const createForm = useFormHandlers<T>(initialFormData);
	const editForm = useFormHandlers<T>(initialFormData);

	return {
		crud,
		createForm,
		editForm,
	};
}
