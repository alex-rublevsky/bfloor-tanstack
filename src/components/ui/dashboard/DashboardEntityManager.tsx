import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import DeleteConfirmationDialog from "~/components/ui/dashboard/ConfirmationDialog";
import { DashboardFormDrawer } from "~/components/ui/dashboard/DashboardFormDrawer";
import { DrawerSection } from "~/components/ui/dashboard/DrawerSection";
import { SlugField } from "~/components/ui/dashboard/SlugField";
import { Button } from "~/components/ui/shared/Button";
import { EmptyState } from "~/components/ui/shared/EmptyState";
import { Input } from "~/components/ui/shared/input";
import { Switch } from "~/components/ui/shared/Switch";
import { useDashboardForm } from "~/hooks/useDashboardForm";
import { generateSlug, useSlugGeneration } from "~/hooks/useSlugGeneration";
import { setDashboardButtons } from "~/lib/dashboardActions";
import { Trash } from "../shared/Icon";

// Generic types for the entity manager
export interface EntityFormData {
	name: string;
	slug: string;
	isActive: boolean;
	[key: string]: unknown; // Allow additional fields
}

export interface EntityManagerConfig<
	TEntity,
	TFormData extends EntityFormData,
> {
	// Data fetching
	queryKey: string[];
	queryFn: () => Promise<TEntity[]>;

	// CRUD operations
	createFn: (data: { data: TFormData }) => Promise<unknown>;
	updateFn: (data: { id: number; data: TFormData }) => Promise<unknown>;
	deleteFn: (data: { id: number }) => Promise<unknown>;

	// UI configuration
	entityName: string;
	entityNamePlural: string;
	emptyStateEntityType: string;

	// Form configuration
	defaultFormData: TFormData;
	formFields: (
		props: EntityFormFieldsProps<TEntity, TFormData>,
	) => React.ReactNode;

	// List rendering
	renderList: (props: EntityListProps<TEntity>) => React.ReactNode;
}

export interface EntityFormFieldsProps<
	TEntity,
	TFormData extends EntityFormData,
> {
	formData: TFormData;
	onFieldChange: <K extends keyof TFormData>(
		field: K,
		value: TFormData[K],
	) => void;
	onSlugChange: (slug: string) => void;
	isAutoSlug: boolean;
	onAutoSlugChange: (isAuto: boolean) => void;
	idPrefix: string;
	entities?: TEntity[];
	editingEntity?: TEntity | null;
}

export interface EntityListProps<TEntity> {
	entities: TEntity[];
	onEdit: (entity: TEntity) => void;
}

// Helper function to convert Russian noun to accusative case
function toAccusativeCase(noun: string): string {
	// For feminine nouns ending in "а", change to "у"
	if (noun.endsWith("а")) {
		return `${noun.slice(0, -1)}у`;
	}
	// For other cases (masculine, neuter), return as is
	return noun;
}

interface DashboardEntityManagerProps<
	TEntity,
	TFormData extends EntityFormData,
> {
	config: EntityManagerConfig<TEntity, TFormData>;
	data?: TEntity[];
	isLoading?: boolean;
	searchTerm?: string; // Optional search term for client-side filtering
}

export function DashboardEntityManager<
	TEntity extends { id: number; name: string; slug: string },
	TFormData extends EntityFormData,
>({
	config,
	data = [],
	isLoading = false,
	searchTerm = "",
}: DashboardEntityManagerProps<TEntity, TFormData>) {
	const queryClient = useQueryClient();
	const createFormId = useId();
	const editFormId = useId();

	// Form state management
	const form = useDashboardForm<TFormData>(config.defaultFormData);

	const [isCreateAutoSlug, setIsCreateAutoSlug] = useState(true);
	const [isEditAutoSlug, setIsEditAutoSlug] = useState(false);
	const [editingEntityId, setEditingEntityId] = useState<number | null>(null);
	const [deletingEntityId, setDeletingEntityId] = useState<number | null>(null);

	// Stable callbacks for slug generation
	const handleCreateSlugChange = useCallback(
		(slug: string) => {
			form.createForm.updateField("slug", slug);
		},
		[form.createForm.updateField],
	);

	const handleEditSlugChange = useCallback(
		(slug: string) => {
			form.editForm.updateField("slug", slug);
		},
		[form.editForm.updateField],
	);

	// Auto-slug generation hooks
	useSlugGeneration(
		form.createForm.formData.name,
		isCreateAutoSlug,
		handleCreateSlugChange,
	);
	useSlugGeneration(
		form.editForm.formData.name,
		isEditAutoSlug,
		handleEditSlugChange,
	);

	// Set navbar action button — opens create drawer directly
	useEffect(() => {
		setDashboardButtons([
			{
				label: `Добавить ${toAccusativeCase(config.entityName)}`,
				onClick: () => form.crud.openCreateDrawer(),
				variant: "default",
				useStatusButton: true,
			},
		]);
		return () => setDashboardButtons([]);
	}, [config.entityName, form.crud.openCreateDrawer]);

	// Submit handler for creating entities
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		form.crud.startSubmitting();

		try {
			await config.createFn({
				data: form.createForm.formData as TFormData,
			});

			// Show success status
			form.crud.setButtonStatus("success");

			toast.success(
				`${config.entityName} добавлен${config.entityName.endsWith("а") ? "а" : ""} успешно!`,
			);

			// Refresh the relevant query
			queryClient.invalidateQueries({
				queryKey: config.queryKey,
			});

			// Close drawer after a brief delay to show success state
			setTimeout(() => {
				closeCreateDrawer();
			}, 800);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "An error occurred";
			form.crud.setError(errorMsg);
			form.crud.setButtonStatus("warning");
			toast.error(errorMsg);
			form.crud.stopSubmitting();
		}
	};

	const closeCreateDrawer = () => {
		form.crud.closeCreateDrawer();
		form.createForm.resetForm();
		setIsCreateAutoSlug(true);
	};

	// Handler for editing entities
	const handleEditEntity = (entity: TEntity) => {
		setEditingEntityId(entity.id);

		// Determine if slug is custom (doesn't match auto-generated)
		const isCustomSlug = entity.slug !== generateSlug(entity.name);

		// Map entity fields to form data
		const entityData = { ...entity } as Record<string, unknown>;

		// Map image to logo for brands (entity has image field, form expects logo)
		if ("image" in entityData && !("logo" in entityData)) {
			entityData.logo = entityData.image;
		}

		form.editForm.setFormData({
			...config.defaultFormData,
			...entityData, // Copy all entity fields to preserve custom fields like parentSlug
			name: entity.name,
			slug: entity.slug,
			isActive: (entity as { isActive?: boolean }).isActive ?? true,
		});
		setIsEditAutoSlug(!isCustomSlug);
		form.crud.openEditDrawer();
	};

	// Handler for updating entities
	const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!editingEntityId) return;

		form.crud.startSubmitting();

		try {
			await config.updateFn({
				id: editingEntityId,
				data: form.editForm.formData as TFormData,
			});

			// Show success status
			form.crud.setButtonStatus("success");

			toast.success(
				`${config.entityName} обновлен${config.entityName.endsWith("а") ? "а" : ""} успешно!`,
			);

			// Refresh the relevant query
			queryClient.invalidateQueries({
				queryKey: config.queryKey,
			});

			// Close drawer after a brief delay to show success state
			setTimeout(() => {
				closeEditModal();
			}, 800);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "An error occurred";
			form.crud.setError(errorMsg);
			form.crud.setButtonStatus("warning");
			toast.error(errorMsg);
			form.crud.stopSubmitting();
		}
	};

	const closeEditModal = () => {
		form.crud.closeEditDrawer();
		setEditingEntityId(null);
		form.editForm.resetForm();
		setIsEditAutoSlug(false);
	};

	// Handler for deleting entities
	const handleDeleteEntityClick = (entity: TEntity) => {
		setDeletingEntityId(entity.id);
		form.crud.openDeleteDialog();
	};

	const handleDeleteConfirm = async () => {
		if (!deletingEntityId) return;

		form.crud.startDeleting();

		try {
			await config.deleteFn({ id: deletingEntityId });

			toast.success(
				`${config.entityName} удален${config.entityName.endsWith("а") ? "а" : ""} успешно!`,
			);

			// Refresh the relevant query
			queryClient.invalidateQueries({
				queryKey: config.queryKey,
			});

			form.crud.closeDeleteDialog();
			setDeletingEntityId(null);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "An error occurred";
			form.crud.setError(errorMsg);
			toast.error(errorMsg);
		} finally {
			form.crud.stopDeleting();
		}
	};

	const handleDeleteCancel = () => {
		form.crud.closeDeleteDialog();
		setDeletingEntityId(null);
	};

	// Client-side filtering based on search term
	const filteredData =
		searchTerm.trim().length >= 2
			? data.filter((entity) => {
					const searchLower = searchTerm.toLowerCase();
					// Search in name and slug
					return (
						entity.name.toLowerCase().includes(searchLower) ||
						entity.slug.toLowerCase().includes(searchLower)
					);
				})
			: data;

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="h-full overflow-auto">
			<div className="space-y-6">
				{/* Entity List */}
				{filteredData.length === 0 ? (
					<EmptyState
						entityType={config.emptyStateEntityType}
						isSearchResult={searchTerm.trim().length >= 2}
					/>
				) : (
					<div className="space-y-4">
						{config.renderList({
							entities: filteredData,
							onEdit: handleEditEntity,
						})}
					</div>
				)}

				{/* Create Entity Drawer */}
				<DashboardFormDrawer
					isOpen={form.crud.showCreateDrawer}
					onOpenChange={form.crud.setShowCreateDrawer}
					title={`Добавить новый${config.entityName.endsWith("а") ? "у" : ""} ${config.entityName}`}
					formId={createFormId}
					isSubmitting={form.crud.isSubmitting}
					submitButtonText={`Создать ${config.entityName}`}
					submittingText="Создание..."
					onCancel={closeCreateDrawer}
					error={
						form.crud.error && !form.crud.showEditDrawer
							? form.crud.error
							: undefined
					}
					layout="single-column"
					buttonStatus={form.crud.buttonStatus}
					successLabel="Готово"
				>
					<form onSubmit={handleSubmit} id={createFormId} className="contents">
						<DrawerSection maxWidth>
							<div className="space-y-4">
								<Input
									label={`Название ${config.entityName}`}
									type="text"
									name="name"
									value={form.createForm.formData.name}
									onChange={form.createForm.handleChange}
									required
								/>

								<SlugField
									slug={form.createForm.formData.slug}
									name={form.createForm.formData.name}
									isAutoSlug={isCreateAutoSlug}
									onSlugChange={(slug) => {
										setIsCreateAutoSlug(false);
										form.createForm.updateField("slug", slug);
									}}
									onAutoSlugChange={setIsCreateAutoSlug}
									idPrefix="create"
								/>

								{config.formFields({
									formData: form.createForm.formData,
									onFieldChange: form.createForm.updateField,
									onSlugChange: handleCreateSlugChange,
									isAutoSlug: isCreateAutoSlug,
									onAutoSlugChange: setIsCreateAutoSlug,
									idPrefix: "create",
									entities: data,
									editingEntity: null,
								})}

								<div className="flex items-center gap-2">
									<Switch
										name="isActive"
										checked={form.createForm.formData.isActive}
										onChange={form.createForm.handleChange}
									/>
									<span className="text-sm">Активен</span>
								</div>
							</div>
						</DrawerSection>
					</form>
				</DashboardFormDrawer>

				{/* Edit Entity Drawer */}
				<DashboardFormDrawer
					isOpen={form.crud.showEditDrawer}
					onOpenChange={form.crud.setShowEditDrawer}
					title={`Редактировать ${config.entityName}`}
					formId={editFormId}
					isSubmitting={form.crud.isSubmitting}
					submitButtonText={`Обновить ${config.entityName}`}
					submittingText="Обновление..."
					onCancel={closeEditModal}
					error={
						form.crud.error && form.crud.showEditDrawer
							? form.crud.error
							: undefined
					}
					buttonStatus={form.crud.buttonStatus}
					successLabel="Готово"
					layout="single-column"
				>
					<form onSubmit={handleUpdate} id={editFormId} className="contents">
						<DrawerSection maxWidth>
							<div className="space-y-4">
								<Input
									label={`Название ${config.entityName}`}
									type="text"
									name="name"
									value={form.editForm.formData.name}
									onChange={form.editForm.handleChange}
									required
								/>

								<SlugField
									slug={form.editForm.formData.slug}
									name={form.editForm.formData.name}
									isAutoSlug={isEditAutoSlug}
									onSlugChange={(slug) => {
										setIsEditAutoSlug(false);
										form.editForm.updateField("slug", slug);
									}}
									onAutoSlugChange={setIsEditAutoSlug}
									idPrefix="edit"
								/>

								<div className="flex items-center gap-2">
									<Switch
										name="isActive"
										checked={form.editForm.formData.isActive}
										onChange={form.editForm.handleChange}
									/>
									<span className="text-sm">Активен</span>
								</div>
							</div>
						</DrawerSection>
						{/* Render additional sections from formFields if needed (e.g., for attribute values) */}
						{(() => {
							const additionalContent = config.formFields({
								formData: form.editForm.formData,
								onFieldChange: form.editForm.updateField,
								onSlugChange: handleEditSlugChange,
								isAutoSlug: isEditAutoSlug,
								onAutoSlugChange: setIsEditAutoSlug,
								idPrefix: "edit",
								entities: data,
								editingEntity:
									data.find((e) => e.id === editingEntityId) || null,
							});
							// Only render if it contains DrawerSection or other valid content
							if (
								additionalContent &&
								typeof additionalContent === "object" &&
								"type" in additionalContent
							) {
								return additionalContent;
							}
							return null;
						})()}

						{/* Delete Button Section */}
						<DrawerSection maxWidth>
							<div className="border-border border-t pt-4">
								<Button
									type="button"
									variant="destructive"
									onClick={() => {
										if (editingEntityId) {
											const entity = data.find((e) => e.id === editingEntityId);
											if (entity) {
												handleDeleteEntityClick(entity);
											}
										}
									}}
									className="w-full"
								>
									<Trash size={16} className="mr-2" />
									Удалить {toAccusativeCase(config.entityName)}
								</Button>
							</div>
						</DrawerSection>
					</form>
				</DashboardFormDrawer>

				{form.crud.showDeleteDialog && (
					<DeleteConfirmationDialog
						isOpen={form.crud.showDeleteDialog}
						onClose={handleDeleteCancel}
						onConfirm={handleDeleteConfirm}
						title={`Удалить ${toAccusativeCase(config.entityName)}`}
						description={`Вы уверены, что хотите удалить этот${config.entityName.endsWith("а") ? "" : ""} ${config.entityName}? Это действие нельзя отменить.`}
						isDeleting={form.crud.isDeleting}
					/>
				)}
			</div>
		</div>
	);
}
