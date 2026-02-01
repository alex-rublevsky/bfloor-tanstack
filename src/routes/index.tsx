import { createFileRoute } from "@tanstack/react-router";
import LogoLoop from "~/components/LogoLoop";
//import { usePrefetch } from "~/hooks/usePrefetch";
import { Banner } from "~/components/ui/Banner";
import AboutSection from "~/components/ui/home/AboutSection";
import BenefitsSection from "~/components/ui/home/BenefitsSection";
import TestimonialSliderSection from "~/components/ui/home/testimonial/TestimonialSection";
import ProductSlider from "~/components/ui/shared/ProductSlider";
import { PRODUCT_TAGS } from "~/constants/units";
import {
	categoriesQueryOptions,
	discountedProductsInfiniteQueryOptions,
	productsByTagInfiniteQueryOptions,
} from "~/lib/queryOptions";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/")({
	component: App,
	head: () => ({
		meta: [
			...seo({
				title: "BeautyFloor",
				description: "Напольные покрытия во Владивостоке",
			}),
		],
	}),

	// Loader prefetches categories and counts before component renders
	// This ensures the catalog dropdown shows counts immediately on page load
	// Also prefetches product carousels for instant display
	loader: async ({ context: { queryClient } }) => {
		// Prefetch categories and counts to ensure consistent server/client rendering
		// Prefetch first tag products (default for tabs carousel) and discounted products
		await Promise.all([
			queryClient.ensureQueryData(categoriesQueryOptions()),
			queryClient.prefetchInfiniteQuery(
				productsByTagInfiniteQueryOptions(PRODUCT_TAGS[0]),
			),
			queryClient.prefetchInfiniteQuery(
				discountedProductsInfiniteQueryOptions(),
			),
		]);
	},
});

function App() {
	//const { prefetchBlog, prefetchStore } = usePrefetch();

	return (
		<>
			<Banner />
			<ProductSlider mode="tabs" title="Товары по категориям" />
			<ProductSlider mode="simple" title="Скидки" />
			<LogoLoop fetchBrands={true} />
			<BenefitsSection />
			<TestimonialSliderSection />
			<AboutSection />
		</>
	);
}
