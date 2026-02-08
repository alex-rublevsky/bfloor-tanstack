import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import DeleteConfirmationDialog from "~/components/ui/dashboard/ConfirmationDialog";
import { OrderCard } from "~/components/ui/dashboard/OrderCard";
import { OrderDrawer } from "~/components/ui/dashboard/OrderDrawer";
import { OrdersPageSkeleton } from "~/components/ui/dashboard/skeletons/OrdersPageSkeleton";
import { Button } from "~/components/ui/shared/Button";
import { EmptyState } from "~/components/ui/shared/EmptyState";
import { CheckSquare, Square, Trash } from "~/components/ui/shared/Icon";
import { dashboardOrdersQueryOptions } from "~/lib/queryOptions";
import {
	deleteOrder,
	deleteOrders,
} from "~/server_functions/dashboard/orders/deleteOrder";
import { updateOrderStatus } from "~/server_functions/dashboard/orders/updateOrderStatus";
import { simpleSearchSchema } from "~/utils/searchSchemas";

const ORDERS_PAGE_SIZE = 50;

export interface OrderItem {
	id: number;
	orderId: number;
	productId: number;
	quantity: number;
	unitAmount: number;
	finalAmount: number;
	discountPercentage: number | null;
	product: {
		name: string;
		images: string | null;
	};
	variation?: {
		id: number;
		sku: string;
	};
	attributes?: Record<string, string>;
}

export interface Order {
	id: number;
	status: string;
	subtotalAmount: number;
	discountAmount: number;
	shippingAmount: number;
	totalAmount: number;
	currency: string;
	paymentMethod: string | null;
	paymentStatus: string;
	shippingMethod: string | null;
	notes: string | null;
	createdAt: Date;
	completedAt: Date | null;
	items: OrderItem[];
}

export const Route = createFileRoute("/dashboard/orders")({
	component: OrderList,
	pendingComponent: OrdersPageSkeleton,
	validateSearch: zodValidator(simpleSearchSchema),
	// Prefetch orders data before component renders
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(dashboardOrdersQueryOptions());
	},
	errorComponent: ({ error }) => {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
				<h2 className="font-semibold text-2xl">Не удалось загрузить заказы</h2>
				<p className="max-w-md text-center text-muted-foreground">
					{error instanceof Error
						? error.message
						: "Произошла непредвиденная ошибка"}
				</p>
				<Button onClick={() => window.location.reload()}>Повторить</Button>
			</div>
		);
	},
});

function OrderList() {
	const queryClient = useQueryClient();
	// Get search params from URL using TanStack Router (consistent with other dashboard pages)
	// Get search params from URL (Zod ensures search is string | undefined)
	const searchParams = Route.useSearch();
	const searchTerm = searchParams.search ?? "";
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
	const [isDeleting, setIsDeleting] = useState(false);

	// Single order deletion state
	const [showSingleDeleteDialog, setShowSingleDeleteDialog] = useState(false);
	const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

	// Bulk deletion state
	const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

	// Order drawer state
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [showOrderDrawer, setShowOrderDrawer] = useState(false);

	// Pagination state
	const [loadedPages, setLoadedPages] = useState(1);
	const currentLimit = ORDERS_PAGE_SIZE * loadedPages;

	// Fetch orders with current pagination (already grouped and sorted by server)
	// Data is guaranteed to be loaded by the loader for the first page
	const { data } = useSuspenseQuery(
		dashboardOrdersQueryOptions(currentLimit, 0),
	);

	// Check if there are more orders to load
	const hasMore = data.pagination?.hasMore ?? false;
	const totalOrders = data.pagination?.total ?? 0;

	const loadMore = useCallback(() => {
		setLoadedPages((prev) => prev + 1);
	}, []);

	const refetch = () => {
		queryClient.invalidateQueries({
			queryKey: ["bfloorDashboardOrders"],
		});
	};

	const handleToggleStatus = async (orderId: number, currentStatus: string) => {
		try {
			// Determine new status
			const newStatus = currentStatus === "processed" ? "pending" : "processed";

			// Call server function to update status
			await updateOrderStatus({
				data: { id: orderId, status: newStatus },
			});

			toast.success(`Order #${orderId} marked as ${newStatus}`);

			// Refresh the orders list
			refetch();
		} catch (error) {
			console.error("Failed to update order status:", error);
			toast.error("Failed to update order status");
		}
	};

	const handleDeleteOrder = async (orderId: number) => {
		setDeletingOrderId(orderId);
		setShowSingleDeleteDialog(true);
	};

	const handleSingleDeleteConfirm = async () => {
		if (!deletingOrderId) return;

		setIsDeleting(true);
		try {
			await deleteOrder({ data: { id: deletingOrderId } });
			toast.success(`Order #${deletingOrderId} deleted successfully`);
			refetch();
		} catch (error) {
			console.error("Failed to delete order:", error);
			toast.error("Failed to delete order");
		} finally {
			setIsDeleting(false);
			setShowSingleDeleteDialog(false);
			setDeletingOrderId(null);
		}
	};

	const handleSingleDeleteCancel = () => {
		setShowSingleDeleteDialog(false);
		setDeletingOrderId(null);
	};

	const handleBulkDelete = async () => {
		if (selectedOrders.size === 0) return;
		setShowBulkDeleteDialog(true);
	};

	const handleBulkDeleteConfirm = async () => {
		if (selectedOrders.size === 0) return;

		setIsDeleting(true);
		try {
			const orderIds = Array.from(selectedOrders);
			await deleteOrders({ data: { ids: orderIds } });
			toast.success(`${orderIds.length} order(s) deleted successfully`);

			// Clear selection and exit selection mode
			setSelectedOrders(new Set());
			setIsSelectionMode(false);
			refetch();
		} catch (error) {
			console.error("Failed to delete orders:", error);
			toast.error("Failed to delete orders");
		} finally {
			setIsDeleting(false);
			setShowBulkDeleteDialog(false);
		}
	};

	const handleBulkDeleteCancel = () => {
		setShowBulkDeleteDialog(false);
	};

	const handleSelectionChange = (orderId: number, selected: boolean) => {
		setSelectedOrders((prev) => {
			const newSet = new Set(prev);
			if (selected) {
				newSet.add(orderId);
			} else {
				newSet.delete(orderId);
			}
			return newSet;
		});
	};

	const toggleSelectionMode = () => {
		setIsSelectionMode(!isSelectionMode);
		if (isSelectionMode) {
			setSelectedOrders(new Set());
		}
	};

	const handleSelectAll = () => {
		if (selectedOrders.size === allOrders.length) {
			// All selected, so deselect all
			setSelectedOrders(new Set());
		} else {
			// Not all selected, so select all
			setSelectedOrders(new Set(allOrders.map((order) => order.id)));
		}
	};

	const handleOrderClick = (order: Order) => {
		if (isSelectionMode) {
			// In selection mode, toggle selection instead of opening drawer
			handleSelectionChange(order.id, !selectedOrders.has(order.id));
		} else {
			// Normal mode, open drawer
			setSelectedOrder(order);
			setShowOrderDrawer(true);
		}
	};

	const handleCloseOrderDrawer = () => {
		setShowOrderDrawer(false);
		setSelectedOrder(null);
	};

	const groupedOrders = data.groupedOrders || [];

	// Flatten all orders for total count
	const allOrders = groupedOrders.flatMap(
		(group: { title: string; orders: Order[] }) => group.orders,
	);

	if (allOrders.length === 0) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<EmptyState entityType="orders" isSearchResult={!!searchTerm} />
			</div>
		);
	}

	// Filter orders within each group based on search
	const filteredGroupedOrders = groupedOrders
		.map((group: { title: string; orders: Order[] }) => ({
			...group,
			orders: group.orders.filter((order: Order) => {
				if (!searchTerm) return true;

				const searchLower = searchTerm.toLowerCase();

				return (
					order.id.toString().includes(searchLower) ||
					order.status.toLowerCase().includes(searchLower) ||
					order.items?.some((item: OrderItem) =>
						item.product.name.toLowerCase().includes(searchLower),
					)
				);
			}),
		}))
		.filter(
			(group: { title: string; orders: Order[] }) => group.orders.length > 0,
		); // Only show groups with orders

	return (
		<div className="space-y-6">
			{/* Orders Stats */}
			<div className="px-4"></div>

			{/* Selection Controls */}
			<div className="flex items-center gap-2 px-4">
				{isSelectionMode && selectedOrders.size > 0 && (
					<Button
						variant="destructive"
						size="sm"
						onClick={handleBulkDelete}
						disabled={isDeleting}
						className="flex items-center gap-1"
					>
						<Trash size={16} />
						Удалить ({selectedOrders.size})
					</Button>
				)}
				<Button
					variant={isSelectionMode ? "default" : "outline"}
					size="sm"
					onClick={toggleSelectionMode}
					className="flex items-center gap-1"
				>
					{isSelectionMode ? (
						<CheckSquare className="h-4 w-4" />
					) : (
						<Square className="h-4 w-4" />
					)}
					Выбрать
				</Button>
				{isSelectionMode && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleSelectAll}
						className="flex items-center gap-1"
					>
						{selectedOrders.size === allOrders.length
							? "Снять выделение"
							: "Выбрать все"}
					</Button>
				)}
			</div>

			{/* Orders Groups */}
			{filteredGroupedOrders.length === 0 ? (
				<EmptyState entityType="orders" isSearchResult={!!searchTerm} />
			) : (
				<div className="space-y-8">
					{/* Render each group from server */}
					{filteredGroupedOrders.map(
						(group: { title: string; orders: Order[] }) => (
							<div key={group.title} className="space-y-4">
								{/* Group Title */}
								<div className="px-4">
									<h2 className="flex items-baseline gap-1 font-semibold text-2xl text-foreground">
										{group.title}
										<span className="text-muted-foreground text-sm">
											{group.orders.length}{" "}
											{group.orders.length === 1 ? "заказ" : "заказов"}
										</span>
									</h2>
								</div>

								{/* Orders Grid */}
								<div className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-1 md:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
									{group.orders.map((order: Order) => (
										<OrderCard
											key={order.id}
											// biome-ignore lint/suspicious/noExplicitAny: OrderCard expects a different Order type
											order={order as any}
											onStatusToggle={handleToggleStatus}
											onDelete={handleDeleteOrder}
											onClick={handleOrderClick}
											isSelectionMode={isSelectionMode}
											isSelected={selectedOrders.has(order.id)}
											onSelectionChange={handleSelectionChange}
										/>
									))}
								</div>
							</div>
						),
					)}
				</div>
			)}

			{/* Load More */}
			{hasMore && (
				<div className="flex justify-center px-4 py-4">
					<Button variant="outline" onClick={loadMore}>
						Загрузить ещё (показано {allOrders.length} из {totalOrders})
					</Button>
				</div>
			)}

			{/* Single Order Delete Confirmation Dialog */}
			{showSingleDeleteDialog && (
				<DeleteConfirmationDialog
					isOpen={showSingleDeleteDialog}
					onClose={handleSingleDeleteCancel}
					onConfirm={handleSingleDeleteConfirm}
					title="Удалить заказ"
					description={`Вы уверены, что хотите удалить заказ #${deletingOrderId}? Это действие нельзя отменить.`}
					isDeleting={isDeleting}
				/>
			)}

			{/* Bulk Delete Confirmation Dialog */}
			{showBulkDeleteDialog && (
				<DeleteConfirmationDialog
					isOpen={showBulkDeleteDialog}
					onClose={handleBulkDeleteCancel}
					onConfirm={handleBulkDeleteConfirm}
					title="Удалить заказы"
					description={`Вы уверены, что хотите удалить ${selectedOrders.size} выбранных заказов? Это действие нельзя отменить.`}
					isDeleting={isDeleting}
				/>
			)}

			{/* Order Drawer */}
			<OrderDrawer
				order={selectedOrder}
				isOpen={showOrderDrawer}
				onClose={handleCloseOrderDrawer}
			/>
		</div>
	);
}
