import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/dashboard/skeleton";
import {
	Drawer,
	DrawerContent,
	DrawerTrigger,
} from "~/components/ui/shared/Drawer";
import { Link } from "~/components/ui/shared/Link";
import { SearchInput } from "~/components/ui/shared/SearchInput";
import { getActionButtonsForRoute } from "~/config/dashboardActionButtons";
import { usePrefetch } from "~/hooks/usePrefetch";
import { useScrollDirection } from "~/hooks/useScrollDirection";
import { useSearchPlaceholderWithCount } from "~/hooks/useSearchPlaceholderWithCount";
import { useCart } from "~/lib/cartContext";
import { useClientSearch } from "~/lib/clientSearchContext";
import {
	categoriesQueryOptions,
	productCategoryCountsQueryOptions,
	userDataQueryOptions,
} from "~/lib/queryOptions";
import type { Category } from "~/types";
import { signOut } from "~/utils/auth-client";
import { cn } from "~/utils/utils";
import { CartDrawerContent } from "../store/CartDrawerContent";
import { BottomNavBar } from "./BottomNavBar";
import { Button } from "./Button";
import {
	ArrowLeftFromLine,
	Icon,
	BadgeCheck as IconBadgeTm,
	Box as IconBox,
	FolderTree as IconCategory,
	Package as IconPackage,
	Tags as IconTags,
	LogOut as LogOutIcon,
	Menu,
	MoreVertical,
	Phone,
} from "./Icon";
import { Logo } from "./Logo";
import { ActionButton, ActionButtons } from "./nav/NavBarActionButtons";
import { SafeArea } from "./SafeArea";

interface NavItem {
	name: string;
	url: string;
	icon?: React.ComponentType;
}

interface NavBarProps {
	items?: NavItem[];
	className?: string;
}

// Dashboard navigation items
const dashboardNavItems: NavItem[] = [
	{ name: "Товары", url: "/dashboard", icon: IconBox },
	{ name: "Категории", url: "/dashboard/categories", icon: IconCategory },
	{ name: "Бренды", url: "/dashboard/brands", icon: IconBadgeTm },
	{ name: "Коллекции", url: "/dashboard/collections", icon: IconCategory },
	{ name: "Атрибуты", url: "/dashboard/attributes", icon: IconTags },
	{ name: "Заказы", url: "/dashboard/orders", icon: IconPackage },
	{ name: "Прочее", url: "/dashboard/misc", icon: IconCategory },
];

const dashboardSecondaryItems: NavItem[] = [
	{ name: "bfloor.ru", url: "/", icon: ArrowLeftFromLine },
];

// Reusable dashboard navigation component - memoized to prevent re-renders
const DashboardNavLinks = memo(
	({
		className = "",
		dashboardNavItems,
		pathname,
		prefetchDashboardOrders,
	}: {
		className?: string;
		dashboardNavItems: NavItem[];
		pathname: string;
		prefetchDashboardOrders: () => void;
	}) => (
		<div
			className={cn(
				"flex gap-[0.25rem] rounded-[1.1875rem] border border-border bg-background p-[0.25rem]",
				className,
			)}
		>
			{dashboardNavItems.map((item) => (
				<Button
					key={item.url}
					to={item.url}
					onMouseEnter={() => {
						// Prefetch orders data on hover
						if (item.url === "/dashboard/orders") {
							prefetchDashboardOrders();
						}
					}}
					variant={pathname === item.url ? "default" : "secondary"}
					size="sm"
					className={pathname === item.url ? "" : "border-0"}
				>
					{item.name}
				</Button>
			))}
		</div>
	),
);
DashboardNavLinks.displayName = "DashboardNavLinks";

const DropdownNavMenu = ({
	items,
	showUserInfo = false,
	userData,
}: {
	items: NavItem[];
	showUserInfo?: boolean;
	userData?: {
		userID: string;
		userName: string;
		userEmail: string;
		userAvatar: string;
	};
}) => {
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const userID = userData?.userID || "";
	const userName = userData?.userName || "";
	const userEmail = userData?.userEmail || "";
	const userAvatar = userData?.userAvatar || "";

	// Handle mouse enter - open dropdown
	const handleMouseEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setIsOpen(true);
	};

	// Handle mouse leave - close dropdown with small delay
	const handleMouseLeave = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setIsOpen(false);
		}, 150);
	};

	// Handle click for mobile devices
	const handleClick = (e: React.MouseEvent) => {
		if (window.matchMedia("(hover: none)").matches) {
			e.preventDefault();
			setIsOpen((prev) => !prev);
		}
	};

	// Close dropdown when clicking outside (mobile only)
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (window.matchMedia("(hover: none)").matches) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}
	}, [isOpen]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="dropdown-container"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleClick(e as unknown as React.MouseEvent);
				}
			}}
			role="menu"
		>
			<button
				type="button"
				className="flex cursor-pointer items-center justify-center p-2 text-foreground hover:text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				<MoreVertical className="h-5 w-5" />
			</button>
			{/* Safe triangle bridge for gap between trigger and menu */}
			{isOpen &&
				containerRef.current &&
				menuRef.current &&
				window.matchMedia("(hover: hover)").matches && (
					<SafeArea
						anchor={containerRef.current}
						submenu={menuRef.current}
						onMouseEnter={handleMouseEnter}
					/>
				)}
			{/* Dropdown menu - positioned below */}
			<div
				ref={menuRef}
				className="dropdown-menu dropdown-menu-right catalog-dropdown-menu-single-column"
				data-open={isOpen ? "true" : "false"}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				role="menu"
			>
				{showUserInfo && (
					<>
						<div className="flex items-center gap-2 border-border border-b px-4 py-2">
							<Avatar className="h-8 w-8 flex-shrink-0 rounded-lg">
								<AvatarImage src={userAvatar} alt={userName || userID} />
								<AvatarFallback className="rounded-lg">
									{userName ? userName.charAt(0).toUpperCase() : "U"}
								</AvatarFallback>
							</Avatar>
							<div className="whitespace-nowrap text-left text-sm leading-tight">
								<div className="font-medium">{userName || userID}</div>
								<div className="text-muted-foreground text-xs">{userEmail}</div>
							</div>
						</div>
						<button
							type="button"
							onClick={async () => {
								try {
									const _result = await signOut();

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
							}}
							className="flex w-full cursor-pointer items-center gap-2 border-border border-b px-4 py-2 text-foreground text-sm transition-standard hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground [&_svg]:hover:text-primary-foreground [&_svg]:active:text-primary-foreground"
						>
							<LogOutIcon className="h-4 w-4" />
							Выйти из аккаунта
						</button>
					</>
				)}
				{items.map((item) =>
					item.url.startsWith("http") ? (
						<Link
							key={item.url}
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							variant="category"
							disableAnimation={true}
						>
							{item.icon && <item.icon />}
							{item.name}
						</Link>
					) : (
						<Link
							key={item.url}
							href={item.url}
							variant="category"
							disableAnimation={true}
						>
							{item.icon && <item.icon />}
							{item.name}
						</Link>
					),
				)}
			</div>
		</div>
	);
};

// Cart Button Component (copied from CartNav) - memoized to prevent re-renders
const CartButton = memo(() => {
	const { cartOpen, setCartOpen, itemCount } = useCart();

	return (
		<Drawer open={cartOpen} onOpenChange={setCartOpen}>
			<DrawerTrigger asChild>
				<button
					type="button"
					onClick={() => setCartOpen(true)}
					className="relative flex h-9 cursor-pointer items-center justify-center text-accent transition-standard hover:text-accent"
				>
					{/* Cart SVG Icon */}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-7 w-auto"
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
					{/* Cart Counter Badge */}
					{itemCount > 0 && (
						<span
							className="-translate-y-1.5 absolute top-0 right-0.5 flex h-5 w-5 translate-x-1.5 items-center justify-center bg-accent font-medium text-accent-foreground! text-sm"
							style={{ borderRadius: "var(--radius-xs)" }}
						>
							{itemCount}
						</span>
					)}
				</button>
			</DrawerTrigger>
			<DrawerContent>
				<CartDrawerContent />
			</DrawerContent>
		</Drawer>
	);
});
CartButton.displayName = "CartButton";

// Mobile Menu Button Component - memoized to prevent re-renders
const MobileMenuButton = memo(() => {
	const [isOpen, setIsOpen] = useState(false);

	const menuItems = useMemo(
		() => [
			{ name: "О компании", url: "/about" },
			{ name: "Контакты и адреса", url: "/contact" },
			{ name: "Доставка и оплата", url: "/delivery" },
		],
		[],
	);

	return (
		<Drawer open={isOpen} onOpenChange={setIsOpen}>
			<DrawerTrigger asChild>
				<Button
					type="button"
					variant="secondary"
					className="group size-9 rounded-sm border-0 p-1 [&_svg]:size-5"
					aria-label="Меню"
				>
					<Menu
						size={20}
						className="text-accent transition-standard group-hover:text-primary-foreground"
					/>
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="px-4 py-6">
					<div className="flex flex-col gap-2">
						{menuItems.map((item) => (
							<Link
								key={item.url}
								href={item.url}
								variant="menu-item"
								disableAnimation={true}
								onClick={() => setIsOpen(false)}
							>
								{item.name}
							</Link>
						))}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
});
MobileMenuButton.displayName = "MobileMenuButton";

// Modern hover dropdown component with safe triangle for gap bridging
const HoverDropdown = ({
	trigger,
	children,
	className = "",
	menuClassName = "",
}: {
	trigger: React.ReactNode | ((isOpen: boolean) => React.ReactNode);
	children: React.ReactNode;
	className?: string;
	menuClassName?: string;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Handle mouse enter - open dropdown
	const handleMouseEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setIsOpen(true);
	};

	// Handle mouse leave - close dropdown with small delay
	const handleMouseLeave = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setIsOpen(false);
		}, 150); // Small delay to allow moving through safe triangle
	};

	// Handle click for mobile devices
	const handleClick = (e: React.MouseEvent) => {
		if (window.matchMedia("(hover: none)").matches) {
			e.preventDefault();
			setIsOpen((prev) => !prev);
		}
	};

	// Close dropdown when clicking outside (mobile only)
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (window.matchMedia("(hover: none)").matches) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}
	}, [isOpen]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn("dropdown-container", className)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleClick(e as unknown as React.MouseEvent);
				}
			}}
			role="menu"
		>
			{typeof trigger === "function" ? trigger(isOpen) : trigger}
			{/* Safe triangle bridge for gap between trigger and menu */}
			{isOpen &&
				containerRef.current &&
				menuRef.current &&
				window.matchMedia("(hover: hover)").matches && (
					<SafeArea
						anchor={containerRef.current}
						submenu={menuRef.current}
						onMouseEnter={handleMouseEnter}
					/>
				)}
			<div
				ref={menuRef}
				className={cn("dropdown-menu", menuClassName)}
				data-open={isOpen ? "true" : "false"}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				role="menu"
			>
				{children}
			</div>
		</div>
	);
};

// Address Dropdown Component - memoized to prevent re-renders
const AddressDropdown = memo(() => {
	return (
		<HoverDropdown
			menuClassName="catalog-dropdown-menu-single-column"
			trigger={(isOpen) => (
				<Link
					href="/contact"
					className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-foreground transition-standard hover:text-primary"
				>
					<Icon
						name="chevron-down"
						size={16}
						className={cn(
							"text-accent transition-faster",
							isOpen && "rotate-180",
						)}
					/>
					ул. Русская, 78
				</Link>
			)}
		>
			<div className="px-4 py-3">
				<div className="space-y-3 text-sm">
					<div className="flex gap-6">
						<div>
							<div className="mb-1 whitespace-nowrap font-semibold">
								ул. Русская, 78
							</div>
							<div className="space-y-0.5 text-muted-foreground">
								<div className="flex items-center justify-between gap-2">
									<span className="whitespace-nowrap">Пн — Пт</span>
									<span className="whitespace-nowrap">10 — 18</span>
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="whitespace-nowrap">Сб</span>
									<span className="whitespace-nowrap">11 — 17</span>
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="whitespace-nowrap">Вс</span>
									<span className="whitespace-nowrap">Выходной</span>
								</div>
							</div>
						</div>
						<div>
							<div className="mb-1 whitespace-nowrap font-semibold">
								ул. 100 летия, 30
							</div>
							<div className="space-y-0.5 text-muted-foreground">
								<div className="flex items-center justify-between gap-2">
									<span className="whitespace-nowrap">Пн — Пт</span>
									<span className="whitespace-nowrap">10 — 18</span>
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="whitespace-nowrap">Сб</span>
									<span className="whitespace-nowrap">11 — 17</span>
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="whitespace-nowrap">Вс</span>
									<span className="whitespace-nowrap">Выходной</span>
								</div>
							</div>
						</div>
					</div>
					<div className="border-border border-t pt-3">
						<Button to="/contact" variant="default" className="w-full">
							Адреса
						</Button>
					</div>
				</div>
			</div>
		</HoverDropdown>
	);
});
AddressDropdown.displayName = "AddressDropdown";

// Phone Dropdown Component - memoized to prevent re-renders
const PhoneDropdown = memo(() => {
	return (
		<HoverDropdown
			menuClassName="catalog-dropdown-menu-single-column"
			trigger={(isOpen) => (
				<Link
					href="tel:+79084466740"
					className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-foreground transition-standard hover:text-primary"
				>
					<Icon
						name="chevron-down"
						size={16}
						className={cn(
							"text-accent transition-faster",
							isOpen && "rotate-180",
						)}
					/>
					8 908 446 6740
				</Link>
			)}
		>
			<div className="px-4 py-3">
				<div className="flex items-stretch gap-4">
					{/* Left column - Contact info */}
					<div className="flex flex-col justify-between text-sm">
						<div>
							<Link href="tel:+79084466740" className="block text-primary">
								8 908 446 6740
							</Link>
						</div>
						<div>
							<Link href="tel:+79025559405" className="block text-primary">
								8 902 555 9405
							</Link>
						</div>
						<div>
							<Link href="tel:+79084486785" className="block text-primary">
								8 908 448 6785
							</Link>
						</div>
						<div>
							<Link href="mailto:romavg@mail.ru" className="block text-primary">
								romavg@mail.ru
							</Link>
						</div>
					</div>
					{/* Right column - Social icons */}
					<div className="flex flex-col items-center gap-2">
						<Button
							href="https://t.me/beautyfloor"
							target="_blank"
							rel="noopener noreferrer"
							variant="secondary"
							className="group h-auto w-auto rounded-sm border-0 p-1.5 [&_svg]:size-7"
							aria-label="Telegram"
						>
							<Icon
								name="telegram"
								size={28}
								className="text-accent transition-standard group-hover:text-primary-foreground"
							/>
						</Button>
						<Button
							href="https://www.instagram.com/beautyfloor_vl/"
							target="_blank"
							rel="noopener noreferrer"
							variant="secondary"
							className="group h-auto w-auto rounded-sm border-0 p-1.5 [&_svg]:size-7"
							aria-label="Instagram"
						>
							<Icon
								name="instagram"
								size={28}
								className="text-accent transition-standard group-hover:text-primary-foreground"
							/>
						</Button>
						<Button
							href="https://wa.me/79084466740"
							target="_blank"
							rel="noopener noreferrer"
							variant="secondary"
							className="group h-auto w-auto rounded-sm border-0 p-1.5 [&_svg]:size-7"
							aria-label="WhatsApp"
						>
							<Icon
								name="whatsapp"
								size={28}
								className="text-accent transition-standard group-hover:text-primary-foreground"
							/>
						</Button>
					</div>
				</div>
			</div>
		</HoverDropdown>
	);
});
PhoneDropdown.displayName = "PhoneDropdown";

// Catalog Dropdown Skeleton - shows 18 skeleton items matching category link structure
const CatalogDropdownSkeleton = () => {
	return (
		<>
			{Array.from({ length: 18 }, (_, index) => `skeleton-item-${index}`).map(
				(key) => (
					<div
						key={key}
						className="flex w-full items-center justify-between px-4 py-2 text-sm"
					>
						<Skeleton className="h-4 max-w-[60%] flex-1" />
						<Skeleton className="h-3 w-6" />
					</div>
				),
			)}
		</>
	);
};

// Catalog Dropdown Component - dropdown on hover at all screen sizes (safe triangle for gap bridging)
// Memoized to prevent re-renders
const CatalogDropdown = memo(() => {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const { data: categories = [] } = useQuery({
		...categoriesQueryOptions(),
	});

	// Load category counts - prefetched in root loader
	const { data: counts = {} } = useQuery(productCategoryCountsQueryOptions());

	// Get prefetch hook for category hover
	const { prefetchStoreWithCategory, prefetchStoreCatalog } = usePrefetch();

	// Check if counts are actually loaded (not just default empty object)
	// This ensures consistent SSR/client rendering
	const countsLoaded = counts && Object.keys(counts).length > 0;

	// Filter active categories and sort by order
	// Only show categories with products (count > 0)
	// If counts not loaded, return empty array to show skeleton
	const activeCategories = useMemo(() => {
		// If counts not loaded, return empty to show skeleton
		// This prevents hydration mismatch
		if (!countsLoaded) {
			return [];
		}

		return categories
			.filter((cat: Category) => cat.isActive)
			.map((category: Category) => ({
				...category,
				productCount: counts[category.slug] ?? 0,
			}))
			.filter((category: Category & { productCount: number }) => {
				// Only show categories with products
				return category.productCount > 0;
			})
			.sort(
				(
					a: Category & { productCount: number },
					b: Category & { productCount: number },
				) => a.order - b.order,
			);
	}, [categories, counts, countsLoaded]);

	// Handle mouse enter - open dropdown and prefetch catalog (categories)
	const handleMouseEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setIsDropdownOpen(true);
		// Prefetch catalog page data when user hovers over catalog button
		prefetchStoreCatalog();
	};

	// Handle mouse leave - close dropdown with small delay
	const handleMouseLeave = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setIsDropdownOpen(false);
		}, 150);
	};

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="dropdown-container catalog-dropdown-container"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			role="menu"
		>
			<Button to="/store" variant="accent" size="sm">
				Каталог
			</Button>
			{/* Safe triangle bridge for gap between trigger and menu */}
			{isDropdownOpen && containerRef.current && menuRef.current && (
				<SafeArea
					anchor={containerRef.current}
					submenu={menuRef.current}
					onMouseEnter={handleMouseEnter}
				/>
			)}
			{/* Dropdown menu - hover to open at all screen sizes */}
			<div
				ref={menuRef}
				className="dropdown-menu catalog-dropdown-menu"
				data-open={isDropdownOpen ? "true" : "false"}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				role="menu"
			>
				{activeCategories.length === 0 ? (
					<CatalogDropdownSkeleton />
				) : (
					activeCategories.map(
						(category: Category & { productCount: number }) => (
							<Link
								key={category.slug}
								href={`/store/${category.slug}`}
								variant="category"
								disableAnimation={true}
								onMouseEnter={() => {
									// Prefetch store data for this category on hover
									prefetchStoreWithCategory(category.slug);
								}}
							>
								<span className="wrap-break-word min-w-0 flex-1 pr-3">
									{category.name}
								</span>
								<span className="shrink-0 text-xs opacity-70">
									{category.productCount}
								</span>
							</Link>
						),
					)
				)}
			</div>
		</div>
	);
});
CatalogDropdown.displayName = "CatalogDropdown";

// Dashboard search input component - extracted to reduce duplication
// Memoized to prevent re-renders
const DashboardSearchInput = memo(
	({
		placeholder,
		value,
		onChange,
		className = "w-full",
	}: {
		placeholder: string;
		value: string;
		onChange: (value: string) => void;
		className?: string;
	}) => {
		return (
			<SearchInput
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				className={className}
			/>
		);
	},
);
DashboardSearchInput.displayName = "DashboardSearchInput";

export function NavBar({ className }: Omit<NavBarProps, "items">) {
	// Only subscribe to pathname, not all router state
	// This prevents re-renders when Link preload triggers on hover
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const { prefetchDashboardOrders } = usePrefetch();
	const dynamicPlaceholder = useSearchPlaceholderWithCount();

	// Memoize pathname checks to prevent unnecessary re-renders
	const isDashboard = useMemo(
		() => pathname.startsWith("/dashboard"),
		[pathname],
	);
	const isMiscPage = useMemo(() => pathname === "/dashboard/misc", [pathname]);

	// Smart navbar: hides on scroll down, shows on scroll up
	const { shouldShowNavbar } = useScrollDirection(300);

	// Fetch userData using TanStack Query
	// This is cached and shared across components, no prop drilling needed
	const { data: userData } = useQuery({
		...userDataQueryOptions(),
	});

	// Check if user is admin - memoized to prevent unnecessary re-renders
	const isAdmin = useMemo(
		() => userData?.isAdmin ?? false,
		[userData?.isAdmin],
	);

	// Client-side search context (for store page)
	const clientSearch = useClientSearch();
	const navigate = useNavigate();

	// Dashboard search - read from URL and update URL directly
	// Use a separate selector to avoid subscribing to all router state
	const currentSearchParam = useRouterState({
		select: (state) =>
			(state.location.search as unknown as Record<string, unknown>)?.search as
				| string
				| number
				| undefined,
	});

	// Local state for input value (for immediate UI feedback)
	const [dashboardSearchInput, setDashboardSearchInput] = useState(() => {
		// Handle both string and number (numeric strings can be parsed as numbers by the router)
		if (typeof currentSearchParam === "string") return currentSearchParam;
		if (typeof currentSearchParam === "number")
			return String(currentSearchParam);
		return "";
	});

	// Keep internal input in sync with URL changes (e.g., back/forward navigation)
	useEffect(() => {
		if (!isDashboard) return;
		const searchValue =
			typeof currentSearchParam === "string"
				? currentSearchParam
				: typeof currentSearchParam === "number"
					? String(currentSearchParam)
					: "";
		setDashboardSearchInput(searchValue);
	}, [isDashboard, currentSearchParam]);

	// Debounced URL update for dashboard search
	useEffect(() => {
		if (!isDashboard || isMiscPage) return;

		const normalized = dashboardSearchInput.trim().replace(/\s+/g, " ");
		const applied = normalized.length >= 2 ? normalized : undefined;

		const handle = setTimeout(() => {
			// Use TanStack Router's navigate with explicit 'to' parameter
			// This maintains type safety and proper router state management
			navigate({
				to: pathname,
				search: (prev) => ({
					...(prev as Record<string, unknown>),
					search: applied,
				}),
				replace: true,
			});
		}, 400);

		return () => clearTimeout(handle);
	}, [isDashboard, isMiscPage, dashboardSearchInput, navigate, pathname]);

	// Get action buttons from configuration - memoized to prevent unnecessary re-renders
	const actionButtons = useMemo(
		() => getActionButtonsForRoute(pathname),
		[pathname],
	);
	const actionButton = useMemo(
		() => (actionButtons.length === 1 ? actionButtons[0] : null),
		[actionButtons],
	);

	// Dashboard navigation layout
	if (isDashboard) {
		return (
			<>
				<nav
					className={cn(
						"navbar-scroll-aware border-border border-b",
						shouldShowNavbar ? "navbar-visible" : "navbar-hidden",
						className,
					)}
				>
					<div className="px-4 py-3">
						{/* Desktop layout - Large screens and above */}
						<div className="hidden items-center gap-4 lg:flex">
							{/* Pages navigation - fixed width */}
							<div className="flex-shrink-0">
								<DashboardNavLinks
									dashboardNavItems={dashboardNavItems}
									pathname={pathname}
									prefetchDashboardOrders={prefetchDashboardOrders}
								/>
							</div>

							{/* Search - takes all available space (dashboard) */}
							{!isMiscPage && (
								<div className="min-w-0 flex-1">
									<DashboardSearchInput
										placeholder={dynamicPlaceholder}
										value={dashboardSearchInput}
										onChange={setDashboardSearchInput}
									/>
								</div>
							)}

							{/* Action button(s) - fixed width */}
							<div className="flex-shrink-0">
								{actionButtons.length > 1 ? (
									<ActionButtons buttons={actionButtons} />
								) : actionButton ? (
									<ActionButton button={actionButton} />
								) : null}
							</div>

							{/* Menu dropdown - fixed width */}
							<div className="flex-shrink-0">
								<DropdownNavMenu
									items={dashboardSecondaryItems}
									showUserInfo={true}
									userData={userData || undefined}
								/>
							</div>
						</div>

						{/* Tablet layout - Medium screens (single row with compact search) */}
						<div className="hidden items-center gap-2 md:flex md:gap-2 lg:hidden">
							{/* Pages navigation */}
							<div className="flex-shrink-0">
								<DashboardNavLinks
									dashboardNavItems={dashboardNavItems}
									pathname={pathname}
									prefetchDashboardOrders={prefetchDashboardOrders}
								/>
							</div>

							{/* Search - flexible width (dashboard) */}
							{!isMiscPage && (
								<div className="min-w-0 flex-1">
									<DashboardSearchInput
										placeholder={dynamicPlaceholder}
										value={dashboardSearchInput}
										onChange={setDashboardSearchInput}
									/>
								</div>
							)}

							{/* Action button(s) */}
							<div className="flex-shrink-0">
								{actionButtons.length > 1 ? (
									<ActionButtons buttons={actionButtons} />
								) : actionButton ? (
									<ActionButton button={actionButton} />
								) : null}
							</div>

							{/* Menu dropdown */}
							<div className="flex-shrink-0">
								<DropdownNavMenu
									items={dashboardSecondaryItems}
									showUserInfo={true}
									userData={userData || undefined}
								/>
							</div>
						</div>

						{/* Mobile layout - Small screens */}
						<div className="w-full md:hidden">
							{/* Search - takes full available space (dashboard) */}
							{!isMiscPage && (
								<DashboardSearchInput
									placeholder={dynamicPlaceholder}
									value={dashboardSearchInput}
									onChange={setDashboardSearchInput}
								/>
							)}
						</div>
					</div>
				</nav>

				{/* Bottom Navigation Bar - Mobile only */}
				<BottomNavBar
					isDashboard={true}
					actionButtons={actionButtons}
					userData={userData || undefined}
				/>
			</>
		);
	}

	// Client navigation layout
	return (
		<>
			<nav
				style={{ viewTransitionName: "--persist-nav" }}
				className={cn(
					"navbar-scroll-aware border-border border-b",
					shouldShowNavbar ? "navbar-visible" : "navbar-hidden",
					className,
				)}
			>
				<div className="px-4 py-3">
					{/* Desktop layout - Large screens and above */}
					<div className="hidden flex-col gap-3 lg:flex">
						{/* First row: Navigation Links */}
						<div className="flex flex-wrap items-center justify-between gap-3 text-sm">
							<AddressDropdown />
							<PhoneDropdown />
							<div className="flex items-center gap-3">
								<Link href="/delivery">Доставка и оплата</Link>
								<Link href="/contact">Контакты и адреса</Link>
								<Link href="/about">О компании</Link>
							</div>
						</div>

						{/* Second row: Logo, Catalog, Search, Cart, Dashboard */}
						<div className="flex items-center gap-4">
							{/* Logo - fixed width */}
							<div className="flex-shrink-0">
								<Link
									href="/"
									className="transition-standard hover:opacity-80"
									disableAnimation={true}
								>
									<Logo className="h-8 w-auto" />
								</Link>
							</div>

							{/* Catalog button with dropdown - fixed width */}
							<div className="flex-shrink-0">
								<CatalogDropdown />
							</div>

							{/* Search - takes all available space */}
							<div className="min-w-0 flex-1">
								<SearchInput
									placeholder={dynamicPlaceholder || "Поиск..."}
									value={clientSearch.searchTerm}
									onChange={clientSearch.setSearchTerm}
									onSubmit={(value) => {
										const trimmed = value.trim();
										if (trimmed.length >= 2) {
											// Navigate to store page if not already there
											if (pathname !== "/store") {
												navigate({ to: "/store" });
											}
										}
									}}
									showSuggestions={true}
									className="w-full"
								/>
							</div>

							{/* Cart button - fixed width */}
							<div className="flex-shrink-0">
								<CartButton />
							</div>

							{/* Dashboard button - fixed width (only for admins) */}
							{isAdmin && (
								<div className="flex-shrink-0">
									<Button to="/dashboard" variant="secondary" size="sm">
										Админка
									</Button>
								</div>
							)}
						</div>
					</div>

					{/* Tablet layout - Medium screens */}
					<div className="hidden flex-col gap-3 md:flex lg:hidden">
						{/* First row: Navigation Links */}
						<div className="flex flex-wrap items-center justify-between gap-3 text-sm">
							<AddressDropdown />
							<PhoneDropdown />
							<div className="flex items-center gap-3">
								<Link href="/delivery">Доставка и оплата</Link>
								<Link href="/contact">Контакты и адреса</Link>
								<Link href="/about">О компании</Link>
							</div>
						</div>

						{/* Second row: Logo, Catalog, Search, Cart, Dashboard (compact single row) */}
						<div className="flex items-center gap-2 md:gap-2 lg:gap-4">
							{/* Logo */}
							<div className="flex-shrink-0">
								<Link
									href="/"
									className="transition-standard hover:opacity-80"
									disableAnimation={true}
								>
									<Logo className="h-8 w-auto" />
								</Link>
							</div>

							{/* Catalog button */}
							<div className="flex-shrink-0">
								<CatalogDropdown />
							</div>

							{/* Search - flexible width */}
							<div className="min-w-0 flex-1">
								<SearchInput
									placeholder={dynamicPlaceholder || "Поиск..."}
									value={clientSearch.searchTerm}
									onChange={clientSearch.setSearchTerm}
									onSubmit={(value) => {
										const trimmed = value.trim();
										if (trimmed.length >= 2) {
											// Navigate to store page if not already there
											if (pathname !== "/store") {
												navigate({ to: "/store" });
											}
										}
									}}
									showSuggestions={true}
									className="w-full"
								/>
							</div>

							{/* Cart button */}
							<div className="flex-shrink-0">
								<CartButton />
							</div>

							{/* Dashboard button (only for admins) */}
							{isAdmin && (
								<div className="flex-shrink-0">
									<Button to="/dashboard" variant="secondary" size="sm">
										Админка
									</Button>
								</div>
							)}
						</div>
					</div>

					{/* Mobile layout - Small screens */}
					<div className="flex items-center gap-1.5 md:hidden">
						{/* Search - takes full available space */}
						<div className="min-w-0 flex-1">
							<SearchInput
								placeholder={dynamicPlaceholder || "Поиск..."}
								value={clientSearch.searchTerm}
								onChange={clientSearch.setSearchTerm}
								onSubmit={(value) => {
									const trimmed = value.trim();
									if (trimmed.length >= 2) {
										// Navigate to store page if not already there
										if (pathname !== "/store") {
											navigate({ to: "/store" });
										}
									}
								}}
								showSuggestions={true}
								className="w-full"
							/>
						</div>

						{/* Phone button - fixed width, matches search bar height */}
						<div className="flex-shrink-0">
							<Button
								to="/contact"
								variant="secondary"
								className="group size-9 rounded-sm border-0 p-1 [&_svg]:size-5"
								aria-label="Контакты и адреса"
							>
								<Phone
									size={20}
									className="text-accent transition-standard group-hover:text-primary-foreground"
								/>
							</Button>
						</div>

						{/* Mobile menu button - fixed width, matches search bar height */}
						<div className="flex-shrink-0">
							<MobileMenuButton />
						</div>

						{/* Dashboard button - fixed width (only for admins) */}
						{isAdmin && (
							<div className="flex-shrink-0">
								<Button to="/dashboard" variant="secondary" size="sm">
									Админка
								</Button>
							</div>
						)}
					</div>
				</div>
			</nav>

			{/* Bottom Navigation Bar - Mobile only */}
			<BottomNavBar />
		</>
	);
}
