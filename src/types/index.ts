import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
	brands,
	categories,
	collections,
	orderItems,
	orders,
	productAttributes,
	productStoreLocations,
	products,
	productVariations,
} from "~/schema";

// Products
export interface Product extends InferSelectModel<typeof products> {}
export type NewProduct = InferInsertModel<typeof products>;

// Product Attributes
export interface ProductAttribute {
	id: number;
	name: string;
	slug: string;
	valueType: string;
	allowMultipleValues: boolean;
}
export type NewProductAttribute = InferInsertModel<typeof productAttributes>;

// Product variation with attributes
export interface ProductVariationWithAttributes {
	id: number;
	productId: number | null;
	sku: string;
	price: number;
	discount: number | null;
	sort: number | null;
	variationAttributes: string | null;
	createdAt: Date;
	attributes: VariationAttribute[];
}

// Extended product type with variations
export interface ProductWithVariations {
	// Base Product fields
	id: number;
	categorySlug: string | null;
	brandSlug: string | null;
	collectionSlug: string | null;
	storeLocationId: number | null;
	name: string;
	slug: string;
	sku: string | null;
	images: string | null;
	description: string | null;
	importantNote: string | null;
	tags: string | null;
	price: number;
	squareMetersPerPack: number | null;
	unitOfMeasurement: string;
	isActive: boolean;
	isFeatured: boolean;
	discount: number | null;
	hasVariations: boolean;
	productAttributes: string | null;
	dimensions: string | null;
	viewCount: number;
	createdAt: Date | null;
	// Extended fields
	variations?: ProductVariationWithAttributes[];
}

// Product group for dashboard
export interface ProductGroup {
	title: string;
	products: ProductWithVariations[];
	categorySlug?: string;
}

// Categories
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

// Categories with count (for filtering)
export interface CategoryWithCount extends Category {
	count: number;
}

// Hierarchical category for tree view
export interface CategoryTreeNode extends Category {
	children: CategoryTreeNode[];
	depth: number;
}

// Brands
export type Brand = InferSelectModel<typeof brands>;
export type NewBrand = InferInsertModel<typeof brands>;

// Countries - now hardcoded in ~/data/countries.ts
// Types are exported from that file

// Collections
export type Collection = InferSelectModel<typeof collections>;
export type NewCollection = InferInsertModel<typeof collections>;

// Store Locations - now hardcoded in ~/data/storeLocations.ts
// Types are exported from that file

// Product Store Locations Junction Table
export type ProductStoreLocation = InferSelectModel<
	typeof productStoreLocations
>;
export type NewProductStoreLocation = InferInsertModel<
	typeof productStoreLocations
>;

// Product Variations
export type ProductVariation = InferSelectModel<typeof productVariations>;
export type NewProductVariation = InferInsertModel<typeof productVariations>;

// Variation Attributes
export interface VariationAttribute {
	id?: number;
	productVariationId?: number | null;
	attributeId: string;
	value: string;
	createdAt?: Date;
	updatedAt?: string;
}

export interface NewVariationAttribute {
	attributeId: string;
	value: string;
}

// Orders
export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

// Order Items
export type OrderItem = InferSelectModel<typeof orderItems>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;

// Form data types for frontend components
export interface ProductFormData {
	name: string;
	slug: string;
	sku?: string; // Article number/SKU - optional
	description: string;
	importantNote?: string; // Важная заметка с поддержкой Markdown - опционально
	tags?: string[]; // Теги для категоризации товаров - опционально
	price: string;
	squareMetersPerPack?: string; // For flooring products: area coverage per pack
	unitOfMeasurement: string; // Единица количества: погонный метр, квадратный метр, литр, штука, упаковка
	categorySlug: string;
	brandSlug: string | null;
	collectionSlug?: string | null;
	storeLocationId?: number | null; // Primary store location
	storeLocationIds?: number[]; // Multiple store location connections - updated
	isActive: boolean;
	isFeatured: boolean;
	discount: number | null;
	hasVariations: boolean;
	images: string;
	attributes?: ProductAttributeFormData[]; // Product-level attributes
	variations: ProductVariationFormData[];
	dimensions?: string; // Product dimensions (габариты) - text field
}

export interface ProductVariationFormData {
	id?: number;
	sku: string; // Auto-generated SKU
	price: string;
	discount?: number | null; // Add discount field
	sort: number;
	attributes: VariationAttributeFormData[];
}

export interface ProductAttributeFormData {
	attributeId: string;
	value: string;
}

export interface VariationAttributeFormData {
	attributeId: string;
	value: string;
}

export interface CategoryFormData {
	name: string;
	slug: string;
	parentSlug?: string | null;
	image: string;
	isActive: boolean;
	order?: number;
	[key: string]: unknown; // Allow additional fields for EntityFormData compatibility
}

export interface BrandFormData {
	name: string;
	slug: string;
	logo: string;
	countryId?: number | null; // Country ID reference - optional
	isActive: boolean;
	[key: string]: unknown; // Allow additional fields for EntityFormData compatibility
}

// CountryFormData removed - countries are now hardcoded in ~/data/countries.ts

export interface CollectionFormData {
	name: string;
	slug: string;
	brandSlug: string;
	isActive: boolean;
	[key: string]: unknown; // Allow additional fields for EntityFormData compatibility
}

export interface StoreLocationFormData {
	address: string;
	description: string;
	openingHours: string;
	isActive: boolean;
}

// API Response Types
export interface ApiResponse<T> {
	data?: T;
	message?: string;
	error?: string;
	[key: string]: unknown;
}

export interface ProductsResponse extends ApiResponse<Product[]> {
	products?: Product[];
}

export interface ProductResponse extends ApiResponse<Product> {
	product?: Product;
}

export interface CategoriesResponse extends ApiResponse<Category[]> {
	categories?: Category[];
}

export interface CategoryResponse extends ApiResponse<Category> {
	category?: Category;
}

export interface BrandsResponse extends ApiResponse<Brand[]> {
	brands?: Brand[];
}

export interface BrandResponse extends ApiResponse<Brand> {
	brand?: Brand;
}

// StoreLocationResponse and StoreLocationsResponse removed - store locations are now hardcoded

/**
 * Minimal CartItem - only IDs and quantity
 * All other data (price, image, stock, etc.) is looked up from TanStack Query cache
 * This eliminates data duplication and ensures we always show current data
 */
export interface CartItem {
	productId: number;
	variationId?: number;
	quantity: number;
	addedAt: number; // Timestamp for sorting/debugging
}

export interface ProductWithDetails {
	// Base Product fields
	id: number;
	categorySlug: string | null;
	brandSlug: string | null;
	collectionSlug: string | null;
	storeLocationId: number | null;
	name: string;
	slug: string;
	sku: string | null;
	images: string[]; // Overridden from Product (string | null -> string[])
	description: string | null;
	importantNote: string | null;
	tags: string | null;
	price: number;
	squareMetersPerPack: number | null;
	unitOfMeasurement: string;
	isActive: boolean;
	isFeatured: boolean;
	discount: number | null;
	hasVariations: boolean;
	dimensions: string | null;
	viewCount: number;
	createdAt: Date | null;
	// Extended fields
	category?: {
		name: string;
		slug: string;
	} | null;
	brand?: {
		name: string;
		slug: string;
		image?: string | null;
		country?: {
			name: string;
			flagImage?: string | null;
		} | null;
	} | null;
	collection?: {
		name: string;
		slug: string;
	} | null;
	storeLocations?: Array<{
		id: number;
		address: string;
		description?: string | null;
		openingHours?: string | null;
	}>;
	storeLocation?: {
		address: string;
	} | null;
	variations?: ProductVariationWithAttributes[];
	productAttributes?: { attributeId: string; value: string }[];
}
