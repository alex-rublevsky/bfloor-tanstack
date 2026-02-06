import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	Drawer,
	DrawerContent,
	DrawerTrigger,
} from "~/components/ui/shared/Drawer";
import type { ActionButtonConfig } from "~/config/dashboardActionButtons";
import { useCart } from "~/lib/cartContext";
import { useDashboardFormStatus } from "~/lib/dashboardFormStatus";
import { signOut } from "~/utils/auth-client";
import { cn } from "~/utils/utils";
import { CartDrawerContent } from "../store/CartDrawerContent";
import { CatalogDrawerContent } from "../store/CatalogDrawerContent";
import { Button } from "./Button";
import { MoreVertical } from "./Icon";
import { MobileActionButtons } from "./nav/NavBarActionButtons";

interface BottomNavBarProps {
	className?: string;
	// Dashboard props
	isDashboard?: boolean;
	actionButton?: {
		label: string;
		onClick: () => void;
	} | null;
	actionButtons?: ActionButtonConfig[];
	// User data for dashboard menu
	userData?: {
		userID: string;
		userName: string;
		userEmail: string;
		userAvatar: string;
	};
}

// Cart Button Component for mobile bottom nav
function CartButton() {
	const { cartOpen, setCartOpen, itemCount } = useCart();

	return (
		<Drawer open={cartOpen} onOpenChange={setCartOpen}>
			<DrawerTrigger asChild>
				<button
					type="button"
					onClick={() => setCartOpen(true)}
					className={cn(
						"relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-standard",
						cartOpen
							? "bg-primary/10 text-primary"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						fill="none"
						viewBox="0 0 33 30"
						aria-label="Корзина"
						role="img"
					>
						<title>Корзина</title>
						<path
							d="M1.94531 1.80127H7.27113L11.9244 18.602C12.2844 19.9016 13.4671 20.8013 14.8156 20.8013H25.6376C26.9423 20.8013 28.0974 19.958 28.495 18.7154L31.9453 7.9303H19.0041"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<circle cx="13.4453" cy="27.3013" r="2.5" fill="currentColor" />
						<circle cx="26.4453" cy="27.3013" r="2.5" fill="currentColor" />
					</svg>
					{itemCount > 0 && (
						<span className="-translate-y-1 -translate-x-1 absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground! text-xs">
							{itemCount}
						</span>
					)}
					<span className="font-medium text-xs">Корзина</span>
				</button>
			</DrawerTrigger>
			<DrawerContent>
				<CartDrawerContent />
			</DrawerContent>
		</Drawer>
	);
}

// Catalog Button Component for mobile bottom nav
function CatalogButton() {
	const [catalogOpen, setCatalogOpen] = useState(false);

	return (
		<Drawer open={catalogOpen} onOpenChange={setCatalogOpen}>
			<DrawerTrigger asChild>
				<button
					type="button"
					onClick={() => setCatalogOpen(true)}
					className={cn(
						"flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-standard",
						catalogOpen
							? "bg-primary/10 text-primary"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
						aria-label="Каталог"
					>
						<title>Каталог</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					<span className="font-medium text-xs">Каталог</span>
				</button>
			</DrawerTrigger>
			<DrawerContent>
				<CatalogDrawerContent />
			</DrawerContent>
		</Drawer>
	);
}

export function BottomNavBar({
	className,
	isDashboard = false,
	actionButton,
	actionButtons,
	userData,
}: BottomNavBarProps) {
	const router = useRouter();
	const navigate = useNavigate();
	const pathname = router.state.location.pathname;
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const formStatus = useDashboardFormStatus();

	// Use actionButtons if provided, otherwise fall back to single actionButton
	const buttons: ActionButtonConfig[] =
		actionButtons ||
		(actionButton ? [{ ...actionButton, variant: "default" as const }] : []);

	// Dashboard navigation items for mobile bottom bar - only Products and Orders
	const dashboardMobileItems = [
		{ name: "Товары", url: "/dashboard", icon: "📦" },
		{ name: "Заказы", url: "/dashboard/orders", icon: "📋" },
	];

	// Dashboard menu items (everything else)
	const dashboardMenuItems = [
		{ name: "Категории", url: "/dashboard/categories", icon: "📂" },
		{ name: "Бренды", url: "/dashboard/brands", icon: "🏷️" },
		{ name: "Коллекции", url: "/dashboard/collections", icon: "📁" },
		{ name: "Атрибуты", url: "/dashboard/attributes", icon: "🏷️" },
		{ name: "Прочее", url: "/dashboard/misc", icon: "⚙️" },
		{ name: "bfloor.ru", url: "/", icon: "🏠" },
	];

	const handleLogout = async () => {
		try {
			await signOut();
			// Clear any local storage or cached data
			localStorage.clear();
			sessionStorage.clear();
			// Force a page reload to clear any cached state and ensure clean logout
			window.location.href = "/";
		} catch (error) {
			console.error("Logout failed", error);
			// Clear local storage even if signOut fails
			localStorage.clear();
			sessionStorage.clear();
			// Fallback to navigation if signOut fails
			navigate({ to: "/" });
		}
	};

	return (
		<>
			{/* Bottom Navigation Bar - Mobile only */}
			<nav
				style={{ viewTransitionName: "--persist-bottom-nav" }}
				className={cn(
					"fixed right-0 bottom-0 left-0 z-10000 border-border border-t bg-background/95 backdrop-blur-sm md:hidden",
					className,
				)}
			>
				<div className="px-4 py-2">
					{isDashboard ? (
						/* Dashboard Mobile Navigation */
						<div className="flex items-center justify-center gap-8">
							{/* Products and Orders */}
							{dashboardMobileItems.map((item) => (
								<Button
									key={item.url}
									to={item.url}
									variant={pathname === item.url ? "default" : "secondary"}
									className={cn(
										"flex h-auto min-w-0 flex-col items-center gap-1 px-3 py-2",
										pathname === item.url
											? "bg-primary/10 text-primary hover:bg-primary/10"
											: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
								>
									<span className="text-lg">{item.icon}</span>
									<span className="text-center font-medium text-xs leading-tight">
										{item.name}
									</span>
								</Button>
							))}

							{/* Menu Button */}
							<div className="relative">
								<button
									type="button"
									onClick={() => setIsMenuOpen(!isMenuOpen)}
									className={cn(
										"flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-standard",
										isMenuOpen
											? "bg-primary/10 text-primary"
											: "text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
								>
									<MoreVertical className="h-5 w-5" />
									<span className="font-medium text-xs">Меню</span>
								</button>

								{/* Menu Popover */}
								{isMenuOpen && (
									<div className="absolute right-0 bottom-full z-50 mb-2 w-64 rounded-lg border border-border bg-background shadow-lg">
										<div className="py-2">
											{/* User Info */}
											{userData && (
												<div className="flex items-center gap-2 border-border border-b px-4 py-2">
													<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-sm">
														{userData.userName
															? userData.userName.charAt(0).toUpperCase()
															: "U"}
													</div>
													<div className="whitespace-nowrap text-sm leading-tight">
														<div className="font-medium">
															{userData.userName || userData.userID}
														</div>
														<div className="text-muted-foreground text-xs">
															{userData.userEmail}
														</div>
													</div>
												</div>
											)}

											{/* Menu Items */}
											{dashboardMenuItems.map((item) => (
												<Button
													key={item.url}
													to={item.url}
													onClick={() => setIsMenuOpen(false)}
													variant="secondary"
													className="flex h-auto w-full items-center justify-start gap-3 rounded-none border-transparent px-4 py-2 text-foreground text-sm transition-standard hover:bg-muted"
												>
													<span className="text-base">{item.icon}</span>
													<span>{item.name}</span>
												</Button>
											))}

											{/* Divider */}
											<div className="my-1 border-border border-t" />

											{/* Logout */}
											<button
												type="button"
												onClick={() => {
													setIsMenuOpen(false);
													handleLogout();
												}}
												className="flex w-full items-center gap-3 px-4 py-2 text-left text-foreground text-sm transition-standard hover:bg-muted"
											>
												<span className="text-base">🚪</span>
												<span>Выйти из аккаунта</span>
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						/* Client-side Mobile Navigation */
						<div className="flex items-center justify-center gap-8">
							{/* Главная (Home) Button */}
							<Link
								to="/"
								className={cn(
									"flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-standard",
									pathname === "/"
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
									aria-label="Главная"
								>
									<title>Главная</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
									/>
								</svg>
								<span className="font-medium text-xs">Главная</span>
							</Link>

							{/* Catalog Button */}
							<CatalogButton />

							{/* Cart Button */}
							<CartButton />
						</div>
					)}
				</div>
			</nav>

			{/* Floating Action Button(s) - Dashboard only, Mobile only */}
			{isDashboard && buttons.length > 0 && (
				<MobileActionButtons buttons={buttons} formStatus={formStatus} />
			)}
		</>
	);
}
