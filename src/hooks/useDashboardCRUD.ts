import { useState } from "react";
import type { ButtonStatus } from "~/components/ui/shared/Button";

/**
 * Common state management for dashboard CRUD operations
 * Handles drawer/modal visibility, submission state, error handling, and delete dialogs
 *
 * @returns Object with all common CRUD states and handlers
 *
 * @example
 * ```ts
 * const {
 *   showCreateDrawer,
 *   openCreateDrawer,
 *   closeCreateDrawer,
 *   isSubmitting,
 *   startSubmitting,
 *   stopSubmitting,
 *   error,
 *   setError,
 *   clearError
 * } = useDashboardCRUD();
 * ```
 */
export function useDashboardCRUD() {
	// Drawer/Modal visibility states
	const [showCreateDrawer, setShowCreateDrawer] = useState(false);
	const [showEditDrawer, setShowEditDrawer] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	// Submission states
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Button status for animated status buttons
	const [buttonStatus, setButtonStatus] = useState<ButtonStatus>("idle");

	// Error state
	const [error, setError] = useState("");

	// Create drawer handlers
	const openCreateDrawer = () => setShowCreateDrawer(true);
	const closeCreateDrawer = () => {
		setShowCreateDrawer(false);
		clearError();
	};

	// Edit drawer handlers
	const openEditDrawer = () => setShowEditDrawer(true);
	const closeEditDrawer = () => {
		setShowEditDrawer(false);
		clearError();
	};

	// Delete dialog handlers
	const openDeleteDialog = () => setShowDeleteDialog(true);
	const closeDeleteDialog = () => setShowDeleteDialog(false);

	// Submission handlers
	const startSubmitting = () => {
		setIsSubmitting(true);
		setButtonStatus("analyzing");
		clearError();
	};
	const stopSubmitting = () => {
		setIsSubmitting(false);
		setButtonStatus("idle");
	};

	// Delete handlers
	const startDeleting = () => {
		setIsDeleting(true);
		clearError();
	};
	const stopDeleting = () => setIsDeleting(false);

	// Error handlers
	const clearError = () => setError("");

	return {
		// Create drawer
		showCreateDrawer,
		openCreateDrawer,
		closeCreateDrawer,
		setShowCreateDrawer,

		// Edit drawer
		showEditDrawer,
		openEditDrawer,
		closeEditDrawer,
		setShowEditDrawer,

		// Delete dialog
		showDeleteDialog,
		openDeleteDialog,
		closeDeleteDialog,
		setShowDeleteDialog,

		// Submission state
		isSubmitting,
		startSubmitting,
		stopSubmitting,
		setIsSubmitting,

		// Delete state
		isDeleting,
		startDeleting,
		stopDeleting,
		setIsDeleting,

		// Button status
		buttonStatus,
		setButtonStatus,

		// Error handling
		error,
		setError,
		clearError,
	};
}
