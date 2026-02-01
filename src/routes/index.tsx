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

	// Loader ensures data is loaded before component renders
	// This prevents hydration mismatches by guaranteeing data availability during SSR
	loader: async ({ context: { queryClient } }) => {
		// Ensure categories and product data are loaded before rendering
		// Use ensureInfiniteQueryData to guarantee data is available during SSR
		await Promise.all([
			queryClient.ensureQueryData(categoriesQueryOptions()),
			queryClient.ensureInfiniteQueryData(
				productsByTagInfiniteQueryOptions(PRODUCT_TAGS[0]),
			),
			queryClient.ensureInfiniteQueryData(
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
