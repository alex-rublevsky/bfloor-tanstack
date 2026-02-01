import {
	useQueryClient,
	useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import type { UseEmblaCarouselType } from "embla-carousel-react";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { ProductWithVariations } from "~/types";
import { getStoreProductsFromInfiniteCache } from "~/utils/storeCache";
import { EmblaArrowButtons } from "../shared/EmblaArrowButtons";
import ProductCard from "../store/ProductCard";
import "./product-slider.css";

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
	const scrollListenerRef = useRef<() => void>(() => undefined);
	const listenForScrollRef = useRef(true);
	const hasMoreToLoadRef = useRef(true);
	const queryClient = useQueryClient();

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

	// Use Suspense query for server-fetched data (modern TanStack approach)
	// This guarantees data is available during SSR - no loading states needed!
	// Remove 'enabled' property as it's not supported by useSuspenseInfiniteQuery
	const { enabled: _enabled, ...suspenseQueryOptions } =
		queryOptions as typeof queryOptions & { enabled?: boolean };
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery(
			suspenseQueryOptions as ReturnType<
				typeof discountedProductsInfiniteQueryOptions
			>,
		);

	// Merge products from all pages
	const products = useMemo(() => {
		if (mode === "recentlyVisited") {
			const storeProducts = getStoreProductsFromInfiniteCache(queryClient);
			const productQueries = queryClient
				.getQueryCache()
				.findAll({ queryKey: ["bfloorProduct"] });
			const productCacheMap = new Map<number, ProductWithVariations>();
			for (const query of productQueries) {
				const product = query.state.data as ProductWithVariations | undefined;
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
				.filter((product): product is ProductWithVariations =>
					Boolean(product?.isActive),
				);
		}

		// With useSuspenseInfiniteQuery, data is ALWAYS available (never undefined)
		// No need for cache fallbacks or loading checks!
		type PageData = {
			products?: ProductWithVariations[];
			pagination?: unknown;
		};
		const allProducts =
			data?.pages
				?.flatMap((page: PageData) => page?.products ?? [])
				?.filter((product: ProductWithVariations) => product.isActive) ?? [];
		return allProducts;
	}, [mode, data, queryClient, recentlyVisitedProductIds]);

	// Update hasMoreToLoad ref when hasNextPage changes
	useEffect(() => {
		hasMoreToLoadRef.current = hasNextPage ?? false;
	}, [hasNextPage]);

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			loop: false,
			dragFree: true,
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

	// Monitor scroll for infinite loading
	const onScroll = useCallback(
		(emblaApi: UseEmblaCarouselType[1]) => {
			if (!listenForScrollRef.current || !emblaApi) return;

			const lastSlide = emblaApi.slideNodes().length - 1;
			const lastSlideInView = emblaApi.slidesInView().includes(lastSlide);

			if (lastSlideInView && hasNextPage && !isFetchingNextPage) {
				listenForScrollRef.current = false;
				fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage],
	);

	const addScrollListener = useCallback(
		(emblaApi: UseEmblaCarouselType[1]) => {
			if (!emblaApi) return;
			scrollListenerRef.current = () => onScroll(emblaApi);
			emblaApi.on("scroll", scrollListenerRef.current);
		},
		[onScroll],
	);

	useEffect(() => {
		if (!emblaApi) return;
		addScrollListener(emblaApi);
	}, [emblaApi, addScrollListener]);

	// Reset scroll listener when fetching completes
	useEffect(() => {
		if (!isFetchingNextPage && products.length > 0) {
			listenForScrollRef.current = true;
		}
	}, [isFetchingNextPage, products.length]);

	// Reset carousel when tag changes
	useEffect(() => {
		if (emblaApi && mode === "tabs" && selectedTag) {
			emblaApi.scrollTo(0);
		}
	}, [emblaApi, selectedTag, mode]);

	// Reinitialize Embla when products load to ensure proper layout
	// This fixes issues where items stack vertically due to initialization timing
	// With Suspense, data is always loaded, so no need to check isLoading
	useEffect(() => {
		if (emblaApi && products.length > 0) {
			// Small delay to ensure DOM has proper dimensions
			const timeoutId = setTimeout(() => {
				emblaApi.reInit();
			}, 0);
			return () => clearTimeout(timeoutId);
		}
	}, [emblaApi, products.length]);

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

				{/* Carousel Controls - only show when there are products */}
				{products.length > 0 && (
					<div className="product-slider__controls">
						<EmblaArrowButtons emblaApi={emblaApi} />
					</div>
				)}
			</div>

			{/* Empty State - with Suspense, data is always loaded, so no loading state needed */}
			{products.length === 0 ? (
				<div className="product-slider__empty">
					<p className="text-muted-foreground">
						{mode === "tabs"
							? "Нет товаров для выбранной категории"
							: mode === "recentlyVisited"
								? "Нет просмотренных товаров"
								: "Нет товаров"}
					</p>
				</div>
			) : (
				<>
					{/* Carousel Viewport */}
					<div className="embla__viewport" ref={emblaRef}>
						<div className="embla__container">
							{products.map((product: ProductWithVariations) => (
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
