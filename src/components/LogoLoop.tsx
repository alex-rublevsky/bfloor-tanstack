import { useQuery } from "@tanstack/react-query";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { brandsQueryOptions } from "~/lib/queryOptions";

export type LogoItem =
	| {
			node: React.ReactNode;
			href?: string;
			title?: string;
			ariaLabel?: string;
	  }
	| {
			src: string;
			alt?: string;
			href?: string;
			title?: string;
			srcSet?: string;
			sizes?: string;
			width?: number;
			height?: number;
	  };

export interface LogoLoopProps {
	logos?: LogoItem[];
	fetchBrands?: boolean; // If true, fetch brands from database instead of using logos prop
	speed?: number;
	direction?: "left" | "right";
	width?: number | string;
	logoHeight?: number;
	gap?: number;
	pauseOnHover?: boolean; // If true, slows down on hover instead of stopping
	speedOnHover?: number; // Speed when hovered (defaults to 30% of normal speed)
	fadeOut?: boolean;
	fadeOutColor?: string;
	scaleOnHover?: boolean;
	ariaLabel?: string;
	className?: string;
	style?: React.CSSProperties;
}

const ANIMATION_CONFIG = {
	SMOOTH_TAU: 0.25,
	HOVER_TRANSITION_TAU: 0.1, // Faster transition for hover state changes
	MIN_COPIES: 2,
	COPY_HEADROOM: 2,
	DEFAULT_HOVER_SPEED_RATIO: 0.3, // Slow down to 30% of normal speed on hover
} as const;

const toCssLength = (value?: number | string): string | undefined =>
	typeof value === "number" ? `${value}px` : (value ?? undefined);

const cx = (...parts: Array<string | false | null | undefined>) =>
	parts.filter(Boolean).join(" ");

const useResizeObserver = (
	callback: () => void,
	elements: Array<React.RefObject<Element | null>>,
	dependencies: React.DependencyList,
) => {
	useEffect(() => {
		if (!window.ResizeObserver) {
			const handleResize = () => callback();
			window.addEventListener("resize", handleResize);
			callback();
			return () => window.removeEventListener("resize", handleResize);
		}

		const observers = elements.map((ref) => {
			if (!ref.current) return null;
			const observer = new ResizeObserver(callback);
			observer.observe(ref.current);
			return observer;
		});

		callback();

		return () => {
			observers.forEach((observer) => {
				observer?.disconnect();
			});
		};
	}, [...dependencies, callback, elements]);
};

const useImageLoader = (
	seqRef: React.RefObject<HTMLUListElement | null>,
	onLoad: () => void,
	dependencies: React.DependencyList,
) => {
	useEffect(() => {
		const images = seqRef.current?.querySelectorAll("img") ?? [];

		if (images.length === 0) {
			onLoad();
			return;
		}

		let remainingImages = images.length;
		const handleImageLoad = () => {
			remainingImages -= 1;
			if (remainingImages === 0) {
				onLoad();
			}
		};

		images.forEach((img) => {
			const htmlImg = img as HTMLImageElement;
			if (htmlImg.complete) {
				handleImageLoad();
			} else {
				htmlImg.addEventListener("load", handleImageLoad, { once: true });
				htmlImg.addEventListener("error", handleImageLoad, { once: true });
			}
		});

		return () => {
			images.forEach((img) => {
				img.removeEventListener("load", handleImageLoad);
				img.removeEventListener("error", handleImageLoad);
			});
		};
	}, [...dependencies, onLoad, seqRef]);
};

const useAnimationLoop = (
	trackRef: React.RefObject<HTMLDivElement | null>,
	targetVelocity: number,
	seqWidth: number,
	isHovered: boolean,
	pauseOnHover: boolean,
	hoverVelocity: number,
) => {
	const rafRef = useRef<number | null>(null);
	const lastTimestampRef = useRef<number | null>(null);
	const offsetRef = useRef(0);
	const velocityRef = useRef(0);

	useEffect(() => {
		const track = trackRef.current;
		if (!track) return;

		const prefersReduced =
			typeof window !== "undefined" &&
			window.matchMedia &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		if (seqWidth > 0) {
			offsetRef.current =
				((offsetRef.current % seqWidth) + seqWidth) % seqWidth;
			track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
		}

		if (prefersReduced) {
			track.style.transform = "translate3d(0, 0, 0)";
			return () => {
				lastTimestampRef.current = null;
			};
		}

		const animate = (timestamp: number) => {
			if (lastTimestampRef.current === null) {
				lastTimestampRef.current = timestamp;
			}

			const deltaTime =
				Math.max(0, timestamp - lastTimestampRef.current) / 1000;
			lastTimestampRef.current = timestamp;

			// Determine target velocity: slow down on hover instead of stopping
			const target = pauseOnHover && isHovered ? hoverVelocity : targetVelocity;

			// Check if we're transitioning (velocity hasn't reached target yet)
			// Use a small threshold to avoid jitter when near target
			const velocityDifference = Math.abs(velocityRef.current - target);
			const isTransitioning = velocityDifference > 1;

			// Use faster tau when actively transitioning for snappier response
			const tau = isTransitioning
				? ANIMATION_CONFIG.HOVER_TRANSITION_TAU
				: ANIMATION_CONFIG.SMOOTH_TAU;

			const easingFactor = 1 - Math.exp(-deltaTime / tau);
			velocityRef.current += (target - velocityRef.current) * easingFactor;

			if (seqWidth > 0) {
				let nextOffset = offsetRef.current + velocityRef.current * deltaTime;
				nextOffset = ((nextOffset % seqWidth) + seqWidth) % seqWidth;
				offsetRef.current = nextOffset;

				const translateX = -offsetRef.current;
				track.style.transform = `translate3d(${translateX}px, 0, 0)`;
			}

			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);

		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			lastTimestampRef.current = null;
		};
	}, [
		targetVelocity,
		seqWidth,
		isHovered,
		pauseOnHover,
		hoverVelocity,
		trackRef,
	]);
};

export const LogoLoop = React.memo<LogoLoopProps>(
	({
		logos: providedLogos,
		fetchBrands = false,
		speed = 120,
		direction = "left",
		width = "100%",
		logoHeight = 28,
		gap = 32,
		pauseOnHover = true,
		speedOnHover,
		fadeOut = false,
		fadeOutColor,
		scaleOnHover = false,
		ariaLabel = "Partner logos",
		className,
		style,
	}) => {
		// Fetch brands from database if fetchBrands is true
		const { data: brands = [] } = useQuery({
			...brandsQueryOptions(),
			enabled: fetchBrands, // Only fetch if fetchBrands is true
		});

		// Transform brands into LogoItem format if fetching brands
		const brandLogos: LogoItem[] = useMemo(() => {
			if (fetchBrands) {
				return brands
					.filter((brand) => brand.isActive && brand.image)
					.map((brand) => ({
						src: `${ASSETS_BASE_URL}/${brand.image}`,
						alt: brand.name,
						title: brand.name,
						href: `/store/${brand.slug}`,
					}));
			}
			return [];
		}, [fetchBrands, brands]);

		// Use provided logos or fetched brand logos
		const logos = providedLogos ?? brandLogos;

		const containerRef = useRef<HTMLDivElement>(null);
		const trackRef = useRef<HTMLDivElement>(null);
		const seqRef = useRef<HTMLUListElement>(null);

		const [seqWidth, setSeqWidth] = useState<number>(0);
		const [copyCount, setCopyCount] = useState<number>(
			ANIMATION_CONFIG.MIN_COPIES,
		);
		const [isHovered, setIsHovered] = useState<boolean>(false);

		const targetVelocity = useMemo(() => {
			const magnitude = Math.abs(speed);
			const directionMultiplier = direction === "left" ? 1 : -1;
			const speedMultiplier = speed < 0 ? -1 : 1;
			return magnitude * directionMultiplier * speedMultiplier;
		}, [speed, direction]);

		const hoverVelocity = useMemo(() => {
			if (speedOnHover !== undefined) {
				const magnitude = Math.abs(speedOnHover);
				const directionMultiplier = direction === "left" ? 1 : -1;
				const speedMultiplier = speedOnHover < 0 ? -1 : 1;
				return magnitude * directionMultiplier * speedMultiplier;
			}
			// Default to 30% of normal speed
			return targetVelocity * ANIMATION_CONFIG.DEFAULT_HOVER_SPEED_RATIO;
		}, [speedOnHover, direction, targetVelocity]);

		const updateDimensions = useCallback(() => {
			const containerWidth = containerRef.current?.clientWidth ?? 0;
			const sequenceWidth =
				seqRef.current?.getBoundingClientRect?.()?.width ?? 0;

			if (sequenceWidth > 0) {
				setSeqWidth(Math.ceil(sequenceWidth));
				const copiesNeeded =
					Math.ceil(containerWidth / sequenceWidth) +
					ANIMATION_CONFIG.COPY_HEADROOM;
				setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
			}
		}, []);

		useResizeObserver(
			updateDimensions,
			[containerRef, seqRef],
			[logos, gap, logoHeight],
		);

		useImageLoader(seqRef, updateDimensions, [logos, gap, logoHeight]);

		useAnimationLoop(
			trackRef,
			targetVelocity,
			seqWidth,
			isHovered,
			pauseOnHover,
			hoverVelocity,
		);

		const cssVariables = useMemo(
			() =>
				({
					"--logoloop-gap": `${gap}px`,
					"--logoloop-logoHeight": `${logoHeight}px`,
					...(fadeOutColor && { "--logoloop-fadeColor": fadeOutColor }),
				}) as React.CSSProperties,
			[gap, logoHeight, fadeOutColor],
		);

		const rootClasses = useMemo(
			() =>
				cx(
					"relative overflow-x-hidden group",
					"[--logoloop-gap:32px]",
					"[--logoloop-logoHeight:28px]",
					"[--logoloop-fadeColorAuto:#ffffff]",
					"dark:[--logoloop-fadeColorAuto:#0b0b0b]",
					scaleOnHover && "py-[calc(var(--logoloop-logoHeight)*0.1)]",
					className,
				),
			[scaleOnHover, className],
		);

		const handleMouseEnter = useCallback(() => {
			if (pauseOnHover) setIsHovered(true);
		}, [pauseOnHover]);

		const handleMouseLeave = useCallback(() => {
			if (pauseOnHover) setIsHovered(false);
		}, [pauseOnHover]);

		const renderLogoItem = useCallback(
			(item: LogoItem, key: React.Key) => {
				const isNodeItem = "node" in item;

				const content = isNodeItem ? (
					<span
						className={cx(
							"inline-flex max-h-full max-w-full items-center",
							"motion-reduce:transition-none",
							scaleOnHover &&
								"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/item:scale-120",
						)}
						aria-hidden={!!item.href && !item.ariaLabel}
					>
						{item.node}
					</span>
				) : (
					<img
						className={cx(
							"block h-auto max-h-full w-full object-contain",
							"pointer-events-none [-webkit-user-drag:none]",
							"[image-rendering:-webkit-optimize-contrast]",
							"motion-reduce:transition-none",
							scaleOnHover &&
								"transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/item:scale-120",
						)}
						src={item.src}
						srcSet={item.srcSet}
						sizes={item.sizes}
						width={item.width}
						height={item.height}
						alt={item.alt ?? ""}
						title={item.title}
						loading="lazy"
						decoding="async"
						draggable={false}
					/>
				);

				const itemAriaLabel = isNodeItem
					? (item.ariaLabel ?? item.title)
					: (item.alt ?? item.title);

				return (
					<li
						className={cx(
							"mr-[var(--logoloop-gap)] flex-none",
							"aspect-square w-[11rem] md:w-[12rem] lg:w-[13rem]",
							"relative",
							"rounded-lg",
							"transition-standard",
							"hover:bg-muted",
							item.href && "cursor-pointer",
							scaleOnHover && "group/item overflow-visible",
						)}
						key={key}
						onMouseEnter={pauseOnHover ? handleMouseEnter : undefined}
						onMouseLeave={pauseOnHover ? handleMouseLeave : undefined}
					>
						{item.href ? (
							<a
								className={cx(
									"absolute inset-0 flex items-center justify-center",
									"z-10 rounded-lg no-underline",
									"focus-visible:outline focus-visible:outline-current focus-visible:outline-offset-2",
								)}
								href={item.href}
								aria-label={itemAriaLabel || "logo link"}
								target="_blank"
								rel="noreferrer noopener"
							>
								<div className="relative z-20 flex h-full w-full items-center justify-center overflow-hidden p-2">
									{content}
								</div>
							</a>
						) : (
							<div className="flex h-full w-full items-center justify-center overflow-hidden p-2">
								{content}
							</div>
						)}
					</li>
				);
			},
			[scaleOnHover, pauseOnHover, handleMouseEnter, handleMouseLeave],
		);

		const logoLists = useMemo(
			() =>
				Array.from({ length: copyCount }, (_, copyIndex) => {
					const copyId = `logo-animation-copy-${copyIndex}`;
					return (
						<ul
							className="flex items-center"
							key={copyId}
							aria-hidden={copyIndex > 0}
							ref={copyIndex === 0 ? seqRef : undefined}
						>
							{logos.map((item, itemIndex) =>
								renderLogoItem(item, `${copyId}-item-${itemIndex}`),
							)}
						</ul>
					);
				}),
			[copyCount, logos, renderLogoItem],
		);

		const containerStyle = useMemo(
			(): React.CSSProperties => ({
				width: toCssLength(width) ?? "100%",
				...cssVariables,
				...style,
			}),
			[width, cssVariables, style],
		);

		return (
			<section
				ref={containerRef}
				className={rootClasses}
				style={containerStyle}
				aria-label={ariaLabel}
			>
				<h2 className="pb-8">Наши партнёры</h2>
				{fadeOut && (
					<>
						<div
							aria-hidden
							className={cx(
								"pointer-events-none absolute inset-y-0 left-0 z-[1]",
								"w-[clamp(24px,8%,120px)]",
								"bg-[linear-gradient(to_right,var(--logoloop-fadeColor,var(--logoloop-fadeColorAuto))_0%,rgba(0,0,0,0)_100%)]",
							)}
						/>
						<div
							aria-hidden
							className={cx(
								"pointer-events-none absolute inset-y-0 right-0 z-[1]",
								"w-[clamp(24px,8%,120px)]",
								"bg-[linear-gradient(to_left,var(--logoloop-fadeColor,var(--logoloop-fadeColorAuto))_0%,rgba(0,0,0,0)_100%)]",
							)}
						/>
					</>
				)}

				<div
					className={cx(
						"flex w-max select-none will-change-transform",
						"motion-reduce:transform-none",
					)}
					ref={trackRef}
				>
					{logoLists}
				</div>
			</section>
		);
	},
);

LogoLoop.displayName = "LogoLoop";

export default LogoLoop;
