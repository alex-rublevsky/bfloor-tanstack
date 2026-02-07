/**
 * Configuration for dashboard action buttons
 * Maps routes to their action button configurations
 */

export type ActionButtonConfig = {
	label: string;
	onClick: () => void;
	variant: "default" | "outline";
	/** Use animated status button (idle/analyzing/success/warning); status from DashboardFormStatusContext */
	useStatusButton?: boolean;
	/** Labels for status suffix when useStatusButton is true */
	statusLabels?: {
		noChanges?: string;
		analyzing?: string;
		success?: string;
		warning?: string;
	};
};

type RouteMatcher = (pathname: string) => boolean;

interface ActionButtonRouteConfig {
	matcher: RouteMatcher;
	buttons: (pathname: string) => ActionButtonConfig[];
}

const PRODUCT_EDIT_PATTERN: RouteMatcher = (pathname) =>
	pathname.startsWith("/dashboard/products/") && pathname.endsWith("/edit");

const PRODUCT_NEW_PATTERN: RouteMatcher = (pathname) =>
	pathname === "/dashboard/products/new";

/**
 * Action button configurations for dashboard routes
 */
const ACTION_BUTTON_CONFIGS: ActionButtonRouteConfig[] = [
	// Product create page - Cancel + Create buttons (primary uses status variant)
	{
		matcher: PRODUCT_NEW_PATTERN,
		buttons: () => [
			{
				label: "Отмена",
				onClick: () =>
					window.dispatchEvent(
						new CustomEvent("productFormAction", {
							detail: { action: "cancel" },
						}),
					),
				variant: "outline",
			},
			{
				label: "Создать товар",
				onClick: () =>
					window.dispatchEvent(
						new CustomEvent("productFormAction", {
							detail: { action: "submit" },
						}),
					),
				variant: "default",
				useStatusButton: true,
				statusLabels: {
					analyzing: "Создание",
					success: "Готово",
					warning: "Ошибка",
				},
			},
		],
	},
	// Product edit page - Cancel + Update buttons (primary uses status variant)
	{
		matcher: PRODUCT_EDIT_PATTERN,
		buttons: () => [
			{
				label: "Отмена",
				onClick: () =>
					window.dispatchEvent(
						new CustomEvent("productFormAction", {
							detail: { action: "cancel" },
						}),
					),
				variant: "outline",
			},
			{
				label: "Обновить товар",
				onClick: () =>
					window.dispatchEvent(
						new CustomEvent("productFormAction", {
							detail: { action: "submit" },
						}),
					),
				variant: "default",
				useStatusButton: true,
				statusLabels: {
					noChanges: "Нет изменений",
					analyzing: "Сохранение",
					success: "Готово",
					warning: "Ошибка",
				},
			},
		],
	},
	// Dashboard index - Add product button
	{
		matcher: (pathname) => pathname === "/dashboard",
		buttons: () => [
			{
				label: "Добавить товар",
				onClick: () => window.dispatchEvent(new CustomEvent("dashboardAction")),
				variant: "default",
				useStatusButton: true,
			},
		],
	},
	// Categories page - Add category button
	{
		matcher: (pathname) => pathname === "/dashboard/categories",
		buttons: () => [
			{
				label: "Добавить категорию",
				onClick: () => window.dispatchEvent(new CustomEvent("dashboardAction")),
				variant: "default",
				useStatusButton: true,
			},
		],
	},
	// Brands page - Add brand button
	{
		matcher: (pathname) => pathname === "/dashboard/brands",
		buttons: () => [
			{
				label: "Добавить бренд",
				onClick: () => window.dispatchEvent(new CustomEvent("dashboardAction")),
				variant: "default",
				useStatusButton: true,
			},
		],
	},
	// Collections page - Add collection button
	{
		matcher: (pathname) => pathname === "/dashboard/collections",
		buttons: () => [
			{
				label: "Добавить коллекцию",
				onClick: () => window.dispatchEvent(new CustomEvent("dashboardAction")),
				variant: "default",
				useStatusButton: true,
			},
		],
	},
	// Attributes page - Add attribute button
	{
		matcher: (pathname) => pathname === "/dashboard/attributes",
		buttons: () => [
			{
				label: "Добавить атрибут",
				onClick: () => window.dispatchEvent(new CustomEvent("dashboardAction")),
				variant: "default",
				useStatusButton: true,
			},
		],
	},
];

/**
 * Get action buttons for a given route pathname
 * @param pathname - Current route pathname
 * @returns Array of action button configurations, or empty array if none match
 */
export function getActionButtonsForRoute(
	pathname: string,
): ActionButtonConfig[] {
	for (const config of ACTION_BUTTON_CONFIGS) {
		if (config.matcher(pathname)) {
			return config.buttons(pathname);
		}
	}
	return [];
}
