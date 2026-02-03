/**
 * Hardcoded catalog images per category slug. No DB calls.
 *
 * Key = category slug. Value = { image, productSlug? }.
 * - image: path relative to ASSETS_BASE_URL.
 * - productSlug: when set, the catalog card uses viewTransitionName
 *   `product-image-${productSlug}` so it morphs into that product’s card on the
 *   category page. ProductCard and product page already use `product-image-${slug}`,
 *   so catalog → category and category → product transitions both work.
 *
 * Example: "dirt-proof" uses antikabluk’s image; productSlug "antikabluk" makes
 * the catalog image transition into the antikabluk ProductCard in the feed.
 */
export const CATEGORY_CATALOG_IMAGES: Record<
	string,
	{ image: string; productSlug?: string }
> = {
	"dirt-proof": { image: "2025/09/antikabluk.png", productSlug: "antikabluk" },
	"inzhenernaya-doska": {
		image: "2024/07/auswood-new-12-oak-madeira.jpg",
		productSlug: "dub-madejra",
	},
	sporty: {
		image: "2024/08/pas30.jpeg",
		productSlug: "iskusstvennaya-trava-landshaft-30-mm",
	},
	laminate: { image: "2024/01/813.png", productSlug: "buk-zbirog" },
	gruntovka: {
		image: "2026/01/gruntovka-forbo-050-europrimer-mix.webp",
		productSlug: "gruntovka-forbo-050-europrimer-mix",
	},
	glue: {
		image: "2024/01/eurocol-140.png",
		productSlug: "klej-forbo-140-euromix-pu-extra",
	},
	accessories: {
		image: "2026/02/lenta.webp",
		productSlug: "mednaya-lenta",
	},
	"rezinovye-nakladki-na-stupeni": {
		image: "2026/02/untitled-2.webp",
		productSlug: "stupen-120030027-5",
	},
	background: {
		image: "2024/01/img-20200412-wa0005.jpg",
		productSlug: "1721",
	},
	rubber: {
		image: "2026/02/untitled-3.webp",
		productSlug: "6-mm-20-cherno-sinyaya",
	},
};
