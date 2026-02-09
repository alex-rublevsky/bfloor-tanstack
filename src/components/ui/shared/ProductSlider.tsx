import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	getProductTagName,
	PRODUCT_TAGS,
	type ProductTag,
} from "~/constants/units";
import {
	discountedProductsInfiniteQueryOptions,
	productsByTagInfiniteQueryOptions,
	recentlyVisitedProductsInfiniteQueryOptions,
} from "~/lib/queryOptions";
import type { ProductListItem } from "~/types";
import { getStoreProductsFromInfiniteCache } from "~/utils/storeCache";
import { EmblaArrowButtons } from "../shared/EmblaArrowButtons";
import ProductCard from "../store/ProductCard";
import "./product-slider.css";

/**
 * Module-level cache for carousel snap positions.
 * Persists across SPA navigations (component unmount/remount) because the
 * JS module stays loaded. Intentionally does NOT survive full page refresh —
 * carousel position is ephemeral UI state.
 */
const carouselSnapCache = new Map<string, number>();

type ProductSliderMode = "simple" | "tabs" | "recentlyVisited";

interface ProductSliderProps {
	mode?: ProductSliderMode;
	title: string;
	tags?: readonly ProductTag[];
	recentlyVisitedProductIds?: number[];
}

export default function ProductSlider({
	mode = "simple",
	title,
	tags = PRODUCT_TAGS,
	recentlyVisitedProductIds = [],
}: ProductSliderProps) {
	const [selectedTag, setSelectedTag] = useState<ProductTag | null>(
		mode === "tabs" ? tags[0] : null,
	);
	const listenForScrollRef = useRef(true);
	const hasMoreToLoadRef = useRef(true);
	const queryClient = useQueryClient();

	// Stable cache key for snap position persistence
	const cacheKey =
		mode === "tabs"
			? `product-slider-tabs-${selectedTag}`
			: `product-slider-${mode}`;

	// Read saved snap position once on mount (ref keeps the value stable across
	// re-renders so the Embla options object doesn't trigger unnecessary reInits)
	const initialSnapRef = useRef(carouselSnapCache.get(cacheKey) ?? 0);

	// Refs for values read inside Embla event handlers — lets us subscribe once
	// per emblaApi lifetime instead of tearing down/re-attaching on every change
	const cacheKeyRef = useRef(cacheKey);
	cacheKeyRef.current = cacheKey;
	const fetchNextPageRef = useRef<() => void>(() => undefined);
	const isFetchingNextPageRef = useRef(false);

	// Determine which query to use
	const queryOptions = useMemo(() => {
		if (mode === "tabs" && selectedTag) {
			return productsByTagInfiniteQueryOptions(selectedTag);
		}
		if (mode === "recentlyVisited") {
			return recentlyVisitedProductsInfiniteQueryOptions(
				recentlyVisitedProductIds,
			);
		}
		return discountedProductsInfiniteQueryOptions();
	}, [mode, selectedTag, recentlyVisitedProductIds]);

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			...(queryOptions as ReturnType<
				typeof discountedProductsInfiniteQueryOptions
			>),
			enabled: mode !== "recentlyVisited" && !(mode === "tabs" && !selectedTag),
		});

	// Merge products from all pages
	const products = useMemo(() => {
		if (mode === "recentlyVisited") {
			const storeProducts = getStoreProductsFromInfiniteCache(queryClient);
			const productQueries = queryClient
				.getQueryCache()
				.findAll({ queryKey: ["bfloorProduct"] });
			const productCacheMap = new Map<number, ProductListItem>();
			for (const query of productQueries) {
				const product = query.state.data as ProductListItem | undefined;
				if (product?.id) {
					productCacheMap.set(product.id, product);
				}
			}

			return recentlyVisitedProductIds
				.map((id) => {
					return (
						storeProducts.find((product) => product.id === id) ??
						productCacheMap.get(id) ??
						null
					);
				})
				.filter((product): product is ProductListItem =>
					Boolean(product?.isActive),
				);
		}

		const allProducts =
			data?.pages
				?.flatMap((page) => page?.products ?? [])
				?.filter((product: ProductListItem) => product.isActive) ?? [];
		return allProducts;
	}, [mode, data, queryClient, recentlyVisitedProductIds]);

	// Sync refs with current values — read inside event handlers so the
	// listeners stay stable and never go stale
	hasMoreToLoadRef.current = hasNextPage ?? false;
	fetchNextPageRef.current = fetchNextPage;
	isFetchingNextPageRef.current = isFetchingNextPage;

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			align: "start",
			loop: false,
			dragFree: true,
			startIndex: initialSnapRef.current,
			watchSlides: (emblaApi) => {
				const reloadEmbla = (): void => {
					const oldEngine = emblaApi.internalEngine();
					emblaApi.reInit();
					const newEngine = emblaApi.internalEngine();

					// Copy engine modules to preserve scroll position
					const copyEngineModules = [
						"scrollBody",
						"location",
						"offsetLocation",
						"previousLocation",
						"target",
					];

					copyEngineModules.forEach((engineModule) => {
						// Engine internal API, types are not fully exposed
						const newEngineModule = newEngine as Record<string, object>;
						const oldEngineModule = oldEngine as Record<string, object>;
						Object.assign(
							newEngineModule[engineModule],
							oldEngineModule[engineModule],
						);
					});

					newEngine.translate.to(oldEngine.location.get());
					const { index } = newEngine.scrollTarget.byDistance(0, false);
					newEngine.index.set(index);
					newEngine.animation.start();

					listenForScrollRef.current = true;
				};

				const reloadAfterPointerUp = (): void => {
					emblaApi.off("pointerUp", reloadAfterPointerUp);
					reloadEmbla();
				};

				const engine = emblaApi.internalEngine();

				if (hasMoreToLoadRef.current && engine.dragHandler.pointerDown()) {
					const boundsActive = engine.limit.reachedMax(engine.target.get());
					engine.scrollBounds.toggleActive(boundsActive);
					emblaApi.on("pointerUp", reloadAfterPointerUp);
				} else {
					reloadEmbla();
				}
			},
		},
		[WheelGesturesPlugin()],
	);

	// Unified Embla event subscription — set up once per emblaApi lifetime.
	// All changing values are read from refs so the handlers never go stale
	// and we never need to tear down / re-attach listeners.
	useEffect(() => {
		if (!emblaApi) return;

		// Infinite-scroll: fetch next page when the last slide enters the viewport
		const onScroll = () => {
			if (!listenForScrollRef.current) return;
			const lastSlide = emblaApi.slideNodes().length - 1;
			const lastSlideInView = emblaApi.slidesInView().includes(lastSlide);
			if (
				lastSlideInView &&
				hasMoreToLoadRef.current &&
				!isFetchingNextPageRef.current
			) {
				listenForScrollRef.current = false;
				fetchNextPageRef.current();
			}
		};

		// Snap position persistence (select = arrow nav, settle = drag/momentum end)
		const saveSnap = () => {
			carouselSnapCache.set(cacheKeyRef.current, emblaApi.selectedScrollSnap());
		};

		emblaApi.on("scroll", onScroll);
		emblaApi.on("select", saveSnap);
		emblaApi.on("settle", saveSnap);

		return () => {
			emblaApi.off("scroll", onScroll);
			emblaApi.off("select", saveSnap);
			emblaApi.off("settle", saveSnap);
		};
	}, [emblaApi]);

	// Re-enable scroll listener after a fetch completes
	useEffect(() => {
		if (!isFetchingNextPage && products.length > 0) {
			listenForScrollRef.current = true;
		}
	}, [isFetchingNextPage, products.length]);

	// When tag changes, restore the cached position for that tab (or start at 0)
	useEffect(() => {
		if (emblaApi && mode === "tabs" && selectedTag) {
			const savedSnap = carouselSnapCache.get(cacheKey) ?? 0;
			emblaApi.scrollTo(savedSnap, true);
		}
	}, [emblaApi, selectedTag, mode, cacheKey]);

	// Reinitialize Embla when products load to ensure proper layout.
	// This fixes issues where items stack vertically due to initialization timing.
	// After reInit we restore the cached snap so the position isn't lost.
	useEffect(() => {
		if (emblaApi && products.length > 0 && !isLoading) {
			// Small delay to ensure DOM has proper dimensions
			const timeoutId = setTimeout(() => {
				emblaApi.reInit();
				// Restore cached position after reInit (reInit can reset to snap 0)
				const savedSnap = carouselSnapCache.get(cacheKey) ?? 0;
				if (savedSnap > 0) {
					emblaApi.scrollTo(savedSnap, true);
				}
			}, 0);
			return () => clearTimeout(timeoutId);
		}
	}, [emblaApi, products.length, isLoading, cacheKey]);

	// Navigation handled by EmblaArrowButtons component

	// const { selectedIndex, scrollSnaps, onDotButtonClick } =
	// 	useDotButton(emblaApi);

	// Don't render if no products (for recently visited mode) — nothing in DOM, including wrapper
	if (mode === "recentlyVisited" && products.length === 0) {
		return null;
	}

	const section = (
		<section className="embla product-slider-section no-padding">
			{/* Header Row - Title/Tags and Arrows */}
			<div className="product-slider__header">
				<div className="product-slider__header-content">
					<h2>{title}</h2>
					{mode === "tabs" && (
						<div className="product-slider__tags">
							{tags.map((tag) => {
								const productCount = undefined;

								return (
									<button
										key={tag}
										type="button"
										onClick={() => setSelectedTag(tag)}
										onMouseEnter={() => {
											// Prefetch products for this tag on hover
											queryClient.prefetchInfiniteQuery(
												productsByTagInfiniteQueryOptions(tag),
											);
										}}
										className={`product-slider__tag-button ${
											selectedTag === tag
												? "product-slider__tag-button--active"
												: ""
										}`}
										disabled={tag === selectedTag && productCount === 0}
									>
										{getProductTagName(tag)}
										{productCount !== undefined && productCount > 0 && (
											<span className="product-slider__tag-count">
												({productCount})
											</span>
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Carousel Controls - shown when products are loaded */}
				{!isLoading && products.length > 0 && (
					<div className="product-slider__controls">
						<EmblaArrowButtons emblaApi={emblaApi} />
					</div>
				)}
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="product-slider__loading">
					<p className="text-muted-foreground">Загрузка товаров...</p>
				</div>
			)}

			{/* Empty State */}
			{!isLoading && products.length === 0 && (
				<div className="product-slider__empty">
					<p className="text-muted-foreground">
						{mode === "tabs"
							? "Нет товаров для выбранной категории"
							: mode === "recentlyVisited"
								? "Нет просмотренных товаров"
								: "Нет товаров"}
					</p>
				</div>
			)}

			{/* Carousel */}
			{!isLoading && products.length > 0 && (
				<>
					{/* Carousel Viewport */}
					<div className="embla__viewport" ref={emblaRef}>
						<div className="embla__container">
							{products.map((product: ProductListItem) => (
								<div className="embla__slide" key={product.id}>
									<div className="px-1 md:px-1.5">
										<ProductCard
											product={product}
											disableViewTransition={mode === "recentlyVisited"}
										/>
									</div>
								</div>
							))}
							{/* Loading indicator when fetching more */}
							{hasNextPage && isFetchingNextPage && (
								<div className="embla__slide">
									<div className="flex items-center justify-center px-1 md:px-1.5">
										<div className="text-muted-foreground">Загрузка...</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</>
			)}
		</section>
	);

	if (mode === "recentlyVisited") {
		return <div className="w-full overflow-x-hidden pt-20">{section}</div>;
	}
	return section;
}
