import { cn } from "~/utils/utils";

// Shared interface for all icon components
export interface IconProps {
	className?: string;
	size?: number;
}

// Simple icons using path data
const createSimpleIcon = (
	name: string,
	pathData: string,
	defaultClassName = "",
) => {
	return function SimpleIcon({ className = "", size = 24 }: IconProps) {
		return (
			<svg
				className={cn(defaultClassName, className)}
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<title>{name}</title>
				<path d={pathData} />
			</svg>
		);
	};
};

// Simple icons
export const Plus = createSimpleIcon("Plus", "M12 4.5v15m7.5-7.5h-15");
export const Minus = createSimpleIcon("Minus", "M4.5 12h15");
export const Check = createSimpleIcon("Check", "M4.5 12.75l6 6 9-13.5");
export const X = createSimpleIcon("X", "M18 6L6 18M6 6l12 12");
export const ChevronLeft = createSimpleIcon(
	"Chevron Left",
	"M15.75 19.5L8.25 12l7.5-7.5",
);
export const ChevronRight = createSimpleIcon(
	"Chevron Right",
	"M8.25 4.5l7.5 7.5-7.5 7.5",
);
export const ChevronDown = createSimpleIcon("Chevron Down", "M6 9l6 6 6-6");
export const Edit = createSimpleIcon(
	"Edit",
	"M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
);

// Complex icons with multiple paths
export function ImageIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Image</title>
			<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
			<circle cx="9" cy="9" r="2" />
			<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
		</svg>
	);
}

export function Trash({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Trash</title>
			<path d="M10 11v6" />
			<path d="M14 11v6" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
			<path d="M3 6h18" />
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		</svg>
	);
}

export function ShoppingBag({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Shopping Bag</title>
			<path d="M16 10a4 4 0 0 1-8 0" />
			<path d="M3.103 6.034h17.794" />
			<path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />
		</svg>
	);
}

export function Search({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 23 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Search</title>
			<path
				d="M0 9.72973C0 15.0991 4.27168 19.4595 9.53185 19.4595C11.5794 19.4595 13.4505 18.8108 15.0038 17.6937L20.7936 23.6036C21.0407 23.8559 21.3937 24 21.7114 24C22.0292 24 22.3822 23.8559 22.6293 23.6036C23.1236 23.0991 23.1236 22.2342 22.6293 21.7297L16.9102 15.8919C18.2517 14.1982 19.0637 12.0721 19.0637 9.72973C19.0637 4.36036 14.792 0 9.53185 0C4.27168 0 0 4.36036 0 9.72973ZM2.08289 9.72973C2.08289 5.54955 5.43668 2.12613 9.53185 2.12613C13.627 2.12613 16.9808 5.51351 16.9808 9.72973C16.9808 13.9459 13.627 17.3333 9.53185 17.3333C5.43668 17.3333 2.08289 13.9099 2.08289 9.72973Z"
				fill="currentColor"
			/>
		</svg>
	);
}

// Brand/Service icons
export function TwoGis({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 48 50"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>2GIS</title>
			<path
				d="M35.6389 29.7526C26.9734 29.7969 25.5716 35.2345 25.1045 39.8322L24.8921 41.8657H23.1504L22.938 39.8322C22.4709 35.2345 21.0266 29.7968 12.6584 29.7526C11.2566 26.7463 10.6619 24.3148 10.6619 21.5739C10.6619 14.7217 16.0567 8.31123 24.0424 8.31123C32.0282 8.31123 37.338 14.6772 37.338 21.6183C37.338 24.3148 37.0832 26.7463 35.6389 29.7526ZM23.9576 0C10.7895 0 0 11.2291 0 24.9778C0 38.7711 10.7895 50 23.9576 50C37.253 50 48 38.7711 48 24.9778C48 11.2291 37.253 0 23.9576 0Z"
				fill="#29B24A"
			/>
		</svg>
	);
}

export function Google({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 35 50"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Google</title>
			<path
				d="M22.7921 0.809157C21.1287 0.286166 19.3465 0 17.5049 0C12.1287 0 7.31683 2.4176 4.09901 6.22656L12.3663 13.1537L22.7921 0.809157Z"
				fill="#1A73E8"
			/>
			<path
				d="M4.09901 6.22656C1.44846 9.36414 -0.00345969 13.3348 6.19072e-06 17.4364C6.19072e-06 20.7125 0.653471 23.3767 1.73268 25.7549L12.3663 13.1537L4.09901 6.22656Z"
				fill="#EA4335"
			/>
			<path
				d="M17.505 10.7756C18.7813 10.7768 20.0306 11.1414 21.106 11.8265C22.1813 12.5117 23.0378 13.4888 23.5746 14.6428C24.1115 15.7968 24.3062 17.0797 24.136 18.3403C23.9658 19.601 23.4377 20.7869 22.6139 21.7584L33.0297 9.41385C30.8918 5.3086 27.2059 2.21721 22.7822 0.819025L12.3763 13.1636C13.0033 12.4152 13.7877 11.8134 14.674 11.4008C15.5602 10.9881 16.5267 10.7747 17.505 10.7756Z"
				fill="#4285F4"
			/>
			<path
				d="M17.505 24.1168C13.8119 24.1168 10.8119 21.1269 10.8119 17.4462C10.8076 15.879 11.362 14.3612 12.3763 13.1636L1.73271 25.7648C3.5545 29.7809 6.5743 33.0077 9.68321 37.0732L22.6139 21.7584C21.9857 22.4982 21.2031 23.0925 20.3207 23.4998C19.4383 23.9071 18.4774 24.1177 17.505 24.1168Z"
				fill="#FBBC04"
			/>
			<path
				d="M22.3564 41.2473C28.198 32.1492 35 28.0146 35 17.4364C35 14.5352 34.2871 11.8019 33.0297 9.39412L9.69308 37.0732C10.6832 38.3659 11.6832 39.7375 12.6535 41.2572C16.198 46.7239 15.2178 50 17.505 50C19.7921 50 18.8119 46.714 22.3564 41.2473Z"
				fill="#34A853"
			/>
		</svg>
	);
}

export function Yandex({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 40 50"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Yandex</title>
			<path
				d="M19.898 0C8.90832 0 0 8.954 0 20C0 25.521 2.22559 30.52 5.82513 34.139C9.42566 37.76 17.9082 43 18.4056 48.5C18.4802 49.3247 19.0742 50 19.898 50C20.7217 50 21.3157 49.3247 21.3903 48.5C21.8878 43 30.3703 37.76 33.9708 34.139C37.5703 30.52 39.7959 25.521 39.7959 20C39.7959 8.954 30.8876 0 19.898 0Z"
				fill="#FF4433"
			/>
			<path
				d="M19.8981 27.0006C23.7443 27.0006 26.8623 23.8665 26.8623 20.0006C26.8623 16.1346 23.7443 13.0006 19.8981 13.0006C16.0518 13.0006 12.9338 16.1346 12.9338 20.0006C12.9338 23.8665 16.0518 27.0006 19.8981 27.0006Z"
				fill="#F7F3F3"
			/>
		</svg>
	);
}

export function Telegram({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 56 43"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Telegram</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M53.1149 0.15198C53.785 0.349437 54.4158 0.727762 54.9175 1.22063C56.321 2.59921 56.0509 4.47899 55.1666 5.80986L33.5205 41.1479L33.33 41.335C33.0521 41.6081 32.6712 41.9825 32.2649 42.2819C31.858 42.5817 31.1753 43 30.3024 43H29.6953C28.6781 43 27.7059 42.5717 27.0793 42.0287L23.0173 39.2855L18.6446 42.2385L18.4093 42.3155C17.2432 42.6974 15.8155 42.7962 14.6464 42.222L14.5483 42.1738L14.4569 42.114C13.8566 41.7209 13.312 41.2344 12.9388 40.5747C12.5581 39.9015 12.4454 39.2069 12.4454 38.5542V31.0999C12.4454 30.8081 12.4944 30.527 12.5699 30.2658C11.3882 30.4945 9.92657 30.4009 8.68951 29.5908L8.6742 29.5808L2.15727 25.216C1.21462 24.8069 0.6831 24.0179 0.405119 23.3625C0.100418 22.6442 0 21.8764 0 21.2603C0 19.0931 1.68787 18.0035 2.4943 17.4829C2.53852 17.4543 2.58008 17.4275 2.61857 17.4023L2.79664 17.2857L50.8838 0.245018C51.6755 -0.101058 52.4939 -0.0310232 53.1149 0.15198ZM20.9931 27.1791L16.5857 30.3539C16.4051 30.5438 16.2308 30.7664 16.105 30.9724C16.0421 31.0754 16.0039 31.1537 15.9834 31.2037V38.5542C15.9834 38.68 15.9942 38.7526 16.0028 38.7908C16.0103 38.8243 16.0172 38.8374 16.0212 38.8445C16.0265 38.8538 16.0713 38.9327 16.269 39.0779C16.2745 39.0792 16.2804 39.0805 16.2868 39.0818C16.3437 39.0932 16.4244 39.1027 16.529 39.1027C16.6892 39.1027 16.8819 39.0804 17.0935 39.0279L22.1707 35.5992H23.8639L29.3043 39.2732L29.4044 39.3715C29.4069 39.3732 29.4101 39.3754 29.4142 39.3781C29.4361 39.3921 29.4695 39.4105 29.5112 39.428C29.5527 39.4455 29.5933 39.4583 29.6292 39.4663C29.6652 39.4743 29.6876 39.4754 29.6953 39.4754H30.1229C30.1342 39.4676 30.147 39.4585 30.1612 39.448C30.3138 39.3357 30.4856 39.1765 30.7278 38.9408L52.187 3.90782L52.2101 3.87379C52.2762 3.77631 52.3136 3.7005 52.3347 3.64714C52.3126 3.63119 52.2897 3.61609 52.2662 3.60211C52.218 3.57344 52.1744 3.55372 52.1394 3.54104L4.38609 20.4634C4.00181 20.7183 3.78846 20.8751 3.64468 21.032C3.57998 21.1026 3.55959 21.1434 3.55299 21.1589C3.5487 21.1689 3.53796 21.1944 3.53796 21.2603C3.53796 21.3879 3.54906 21.5279 3.57298 21.6637C3.59718 21.801 3.63052 21.9115 3.66405 21.9906C3.66823 22.0005 3.67218 22.0094 3.67588 22.0174L3.76748 22.0474L10.6385 26.6492C10.9509 26.8502 11.5045 26.9162 12.0306 26.7759L18.564 23.4275C18.96 23.0607 19.5024 22.8351 20.1267 22.8863C20.8918 22.9489 21.447 23.4036 21.7508 23.8512C22.0797 24.3358 22.2448 24.9867 22.0819 25.6667C21.9208 26.3391 21.4897 26.8428 20.9931 27.1791Z"
				fill="currentColor"
			/>
		</svg>
	);
}

export function Instagram({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 43 43"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Instagram</title>
			<path
				d="M42.6715 10.8788C42.343 7.92573 41.3574 5.62887 39.0579 3.66012C36.7583 1.69138 34.1302 0.707009 31.1736 0.378885C26.2459 0.0507609 14.091 -0.277363 10.1488 0.378885C5.22116 1.36326 1.93605 3.98825 0.622001 8.9101C-0.363534 12.5195 -0.0350223 29.2538 0.622001 32.8631C1.27902 37.785 4.23563 41.0662 9.1633 42.3787C12.4484 43.3631 29.2025 43.035 32.8161 42.3787C37.7438 41.7225 41.0289 38.7694 42.343 33.8475C43.3285 30.2382 43 14.1601 42.6715 10.8788ZM38.7294 32.2069C38.0723 35.8163 35.7727 38.4412 31.8306 38.7694C28.217 39.0975 12.7769 39.4256 9.49182 38.4412C6.53521 37.4569 4.89265 35.4881 4.23563 32.535C3.90712 29.5819 3.57861 14.8163 4.23563 10.8788C4.89265 7.26948 7.19223 4.97262 11.1344 4.31637C15.0765 3.98825 28.5455 3.98825 32.1591 4.31637C35.7727 4.97262 38.0723 7.26948 38.7294 11.207C39.0579 14.8163 39.3864 28.5975 38.7294 32.2069ZM21.3182 10.5507C15.0765 10.5507 10.1488 15.4726 10.1488 21.7069C10.1488 27.9413 15.0765 32.8631 21.3182 32.8631C27.56 32.8631 32.4876 27.9413 32.4876 21.7069C32.4876 15.4726 27.56 10.5507 21.3182 10.5507ZM21.3182 28.5975C17.3761 28.5975 14.091 25.3163 14.091 21.3788C14.091 17.4413 17.3761 14.1601 21.3182 14.1601C25.2604 14.1601 28.5455 17.4413 28.5455 21.3788C28.5455 25.6444 25.2604 28.5975 21.3182 28.5975ZM35.4442 10.2226C35.4442 11.5351 34.1302 12.8476 32.8161 12.8476C31.5021 12.8476 30.188 11.5351 30.188 10.2226C30.188 8.9101 31.5021 7.59761 32.8161 7.59761C34.4587 7.59761 35.4442 8.58198 35.4442 10.2226Z"
				fill="currentColor"
			/>
		</svg>
	);
}

export function WhatsApp({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 43 43"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>WhatsApp</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M0 43C0.315768 42.0566 0.315768 41.1133 0.631535 40.4844C1.26307 37.9688 2.21037 35.4532 2.84191 32.6231C2.84191 32.3087 2.84191 31.6798 2.84191 31.3653C-3.78921 18.7873 3.15768 3.69372 16.7357 0.549223C29.3664 -2.28083 40.734 6.20933 42.6286 17.2151C44.839 28.8497 36.9448 40.1699 25.2614 42.3711C20.5249 43.3144 16.1042 42.3711 11.9992 40.4844C11.6834 40.1699 11.0519 40.1699 10.7361 40.4844C5.05228 41.7422 1.26307 42.6856 0 43ZM5.05228 37.9688C7.26266 37.3399 9.15726 37.0254 11.0519 36.3965C11.6834 36.3965 11.9992 36.3965 12.6307 36.711C16.4199 38.9121 20.2091 39.541 24.6299 38.9121C34.4187 37.3399 41.0498 28.2208 39.471 18.7873C37.5764 8.72493 28.4191 1.80702 18.3145 3.69373C6.31536 5.89488 0 19.4162 5.99959 29.7931C6.63112 31.0509 6.94689 31.9942 6.31535 33.252C5.68382 34.8243 5.36805 36.3965 5.05228 37.9688Z"
				fill="currentColor"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M27.1574 31.3634C23.0525 31.3634 16.4213 27.9044 11.6848 20.0431C10.106 17.2131 10.4218 14.0686 12.6321 11.8674C13.5794 11.2385 14.5267 11.2385 15.474 11.553C15.7898 11.553 15.7898 11.8674 16.1056 12.1819C16.7371 13.4397 17.3686 15.0119 17.6844 16.2697C18.0002 16.8986 17.3686 17.842 16.4213 19.0998C16.1056 19.4142 16.1056 19.7287 16.4213 20.3576C18.3159 23.1876 20.5263 25.3888 23.9998 26.6466C24.6313 26.961 24.9471 26.6466 25.2628 26.3321C26.8417 24.131 27.1574 23.5021 28.1047 24.131C32.5255 26.3321 32.8413 26.3321 32.8413 26.6466C32.5255 30.42 29.052 31.6778 27.1574 31.3634Z"
				fill="currentColor"
			/>
		</svg>
	);
}

// Legacy Icon component for backward compatibility (will be removed after migration)
interface LegacyIconProps {
	name:
		| "plus"
		| "minus"
		| "check"
		| "x"
		| "chevron-left"
		| "chevron-right"
		| "chevron-down"
		| "image"
		| "2gis"
		| "google"
		| "yandex"
		| "edit"
		| "telegram"
		| "instagram"
		| "whatsapp"
		| "search"
		| "trash"
		| "shopping-bag"
		| "phone"
		| "menu";
	className?: string;
	size?: number;
}

/**
 * @deprecated Use named exports instead (e.g., import { Trash } from "~/components/ui/shared/Icon")
 * This component exists for backward compatibility and will be removed in a future version.
 */
export function Icon({ name, className = "", size = 24 }: LegacyIconProps) {
	const iconMap = {
		plus: Plus,
		minus: Minus,
		check: Check,
		x: X,
		"chevron-left": ChevronLeft,
		"chevron-right": ChevronRight,
		"chevron-down": ChevronDown,
		image: ImageIcon,
		"2gis": TwoGis,
		google: Google,
		yandex: Yandex,
		edit: Edit,
		telegram: Telegram,
		instagram: Instagram,
		whatsapp: WhatsApp,
		search: Search,
		trash: Trash,
		"shopping-bag": ShoppingBag,
		phone: Phone,
		menu: Menu,
	};

	const IconComponent = iconMap[name];
	return <IconComponent className={className} size={size} />;
}

// Additional icons
export function Upload({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Upload</title>
			<path d="M12 3v12" />
			<path d="m17 8-5-5-5 5" />
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		</svg>
	);
}

export function Clock({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Clock</title>
			<path d="M12 6v6l4 2" />
			<circle cx="12" cy="12" r="10" />
		</svg>
	);
}

export function ExternalLink({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>External Link</title>
			<path d="M15 3h6v6" />
			<path d="M10 14 21 3" />
			<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
		</svg>
	);
}

export function Eye({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Eye</title>
			<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

export function Square({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Square</title>
			<rect width="18" height="18" x="3" y="3" rx="2" />
		</svg>
	);
}

export function CheckSquare({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Check Square</title>
			<path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" />
			<path d="m9 11 3 3L22 4" />
		</svg>
	);
}

export function Loader2({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Loader</title>
			<path d="M21 12a9 9 0 1 1-6.219-8.56" />
		</svg>
	);
}

export function Circle({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Circle</title>
			<circle cx="12" cy="12" r="10" />
		</svg>
	);
}

export function CheckCircle({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Check Circle</title>
			<path d="M21.801 10A10 10 0 1 1 17 3.335" />
			<path d="m9 11 3 3L22 4" />
		</svg>
	);
}

export function GripVertical({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Grip Vertical</title>
			<circle cx="9" cy="12" r="1" />
			<circle cx="9" cy="5" r="1" />
			<circle cx="9" cy="19" r="1" />
			<circle cx="15" cy="12" r="1" />
			<circle cx="15" cy="5" r="1" />
			<circle cx="15" cy="19" r="1" />
		</svg>
	);
}

export function GripHorizontal({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Grip Horizontal</title>
			<circle cx="12" cy="9" r="1" />
			<circle cx="19" cy="9" r="1" />
			<circle cx="5" cy="9" r="1" />
			<circle cx="12" cy="15" r="1" />
			<circle cx="19" cy="15" r="1" />
			<circle cx="5" cy="15" r="1" />
		</svg>
	);
}

export function AlertCircle({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Alert Circle</title>
			<circle cx="12" cy="12" r="10" />
			<line x1="12" x2="12" y1="8" y2="12" />
			<line x1="12" x2="12.01" y1="16" y2="16" />
		</svg>
	);
}

export function EllipsisVertical({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Ellipsis Vertical</title>
			<circle cx="12" cy="12" r="1" />
			<circle cx="12" cy="5" r="1" />
			<circle cx="12" cy="19" r="1" />
		</svg>
	);
}

// Alias for backward compatibility (previously called MoreVertical)
export const MoreVertical = EllipsisVertical;

export function LogOut({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Log Out</title>
			<path d="m16 17 5-5-5-5" />
			<path d="M21 12H9" />
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
		</svg>
	);
}

export function Package({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Package</title>
			<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
			<path d="M12 22V12" />
			<polyline points="3.29 7 12 12 20.71 7" />
			<path d="m7.5 4.27 9 5.15" />
		</svg>
	);
}

export function Ellipsis({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Ellipsis</title>
			<circle cx="12" cy="12" r="1" />
			<circle cx="19" cy="12" r="1" />
			<circle cx="5" cy="12" r="1" />
		</svg>
	);
}

// Alias for backward compatibility (previously called MoreHorizontal)
export const MoreHorizontal = Ellipsis;

export function FolderTree({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Folder Tree</title>
			<path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" />
			<path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" />
			<path d="M3 5a2 2 0 0 0 2 2h3" />
			<path d="M3 3v13a2 2 0 0 0 2 2h3" />
		</svg>
	);
}

export function Box({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Box</title>
			<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
			<path d="m3.3 7 8.7 5 8.7-5" />
			<path d="M12 22V12" />
		</svg>
	);
}

export function Columns({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Columns</title>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M12 3v18" />
		</svg>
	);
}

export function Download({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Download</title>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" x2="12" y1="15" y2="3" />
		</svg>
	);
}

export function Email({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Email</title>
			<rect width="20" height="16" x="2" y="4" rx="2" />
			<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
		</svg>
	);
}

export function ArrowLeftFromLine({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Arrow Left From Line</title>
			<path d="m9 6-6 6 6 6" />
			<path d="M3 12h14" />
			<path d="M21 19V5" />
		</svg>
	);
}

export function Tags({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Tags</title>
			<path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z" />
			<path d="M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193" />
			<circle cx="10.5" cy="6.5" r=".5" fill="currentColor" />
		</svg>
	);
}

export function BadgeCheck({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Badge Check</title>
			<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
			<path d="m9 12 2 2 4-4" />
		</svg>
	);
}

export function ChevronsLeft({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Chevrons Left</title>
			<path d="m11 17-5-5 5-5" />
			<path d="m18 17-5-5 5-5" />
		</svg>
	);
}

export function ChevronsRight({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Chevrons Right</title>
			<path d="m6 17 5-5-5-5" />
			<path d="m13 17 5-5-5-5" />
		</svg>
	);
}

export function TrendingUp({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Trending Up</title>
			<path d="M16 7h6v6" />
			<path d="m22 7-8.5 8.5-5-5L2 17" />
		</svg>
	);
}

export function Phone({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Phone</title>
			<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
		</svg>
	);
}

export function Menu({ className = "", size = 24 }: IconProps) {
	// Calculate scale to maintain aspect ratio
	const aspectRatio = 16 / 7;
	const height = size;
	const width = height * aspectRatio;

	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 16 7"
			fill="none"
			aria-hidden="true"
		>
			<title>Menu</title>
			<path d="M0 0H16V2H0V0Z" fill="currentColor" />
			<path d="M0 5H10V7H0V5Z" fill="currentColor" />
		</svg>
	);
}

export function Newspaper({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			className={cn("text-muted-foreground", className)}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Newspaper</title>
			<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
			<path d="M18 14h-8" />
			<path d="M15 18h-5" />
			<path d="M10 6h8v4h-8V6Z" />
		</svg>
	);
}
