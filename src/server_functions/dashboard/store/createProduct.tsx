import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import {
	productAttributeValues,
	productBrands,
	productCollections,
	productStoreLocations,
	products,
	productVariations,
	variationAttributes,
} from "~/schema";
import type { ProductFormData } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getAttributeMappings } from "~/utils/attributeMapping";
import { getBatchValueIds } from "~/utils/attributeValueLookup";
import { getStorageBucket } from "~/utils/storage";
import { validateAttributeValues } from "~/utils/validateAttributeValues";
import {
	getProductImageStorageKey,
	moveStagingImagesWithBucket,
} from "./moveStagingImages";

export const createProduct = createServerFn({ method: "POST" })
	.inputValidator((data: ProductFormData) => data)
	.handler(async ({ data }) => {
		// Track moved images for cleanup on error (declared outside try for catch access)
		let movedImagePaths: string[] = [];

		try {
			const db = DB();
			const productData = data;

			// === VALIDATION PHASE (outside transaction — read-only) ===

			if (!productData.name || !productData.slug || !productData.price) {
				throw new ApiError(
					"Missing required fields: name, slug, and price are required",
					400,
				);
			}

			if (!productData.unitOfMeasurement) {
				throw new ApiError("Unit of measurement is required", 400);
			}

			// Check for duplicate slug
			const duplicateSlug = await db
				.select()
				.from(products)
				.where(eq(products.slug, productData.slug))
				.limit(1);

			if (duplicateSlug[0]) {
				throw new ApiError("A product with this slug already exists", 400);
			}

			// Validate all attribute values BEFORE moving images
			const attributeValidationInputs: Array<{
				attributeId: string;
				value: string;
			}> = [];
			if (productData.attributes?.length) {
				attributeValidationInputs.push(...productData.attributes);
			}
			if (productData.variations?.length) {
				const varAttrs = productData.variations.flatMap(
					(v) => v.attributes || [],
				);
				if (varAttrs.length > 0) {
					attributeValidationInputs.push(...varAttrs);
				}
			}

			if (attributeValidationInputs.length > 0) {
				const validationErrors = await validateAttributeValues(
					db,
					attributeValidationInputs,
				);
				if (validationErrors.length > 0) {
					const errorMessages = validationErrors
						.map((err) => err.error)
						.join("; ");
					throw new ApiError(
						`Ошибки валидации атрибутов: ${errorMessages}`,
						400,
					);
				}
			}

			// === MOVE STAGING IMAGES (outside transaction — storage I/O) ===

			let imagesJson = "";

			if (productData.images?.trim()) {
				const imagePaths = productData.images
					.split(",")
					.map((img) => img.trim())
					.filter(Boolean);

				const hasStagingImages = imagePaths.some((path) =>
					path.startsWith("staging/"),
				);

				if (hasStagingImages) {
					const bucket = getStorageBucket();
					const moveResult = await moveStagingImagesWithBucket(bucket, {
						imagePaths,
						finalFolder: "products",
						categorySlug: productData.categorySlug,
						productName: productData.name,
						slug: productData.slug,
					});

					if (moveResult?.pathMap) {
						const updatedPaths = imagePaths
							.map((path) => moveResult.pathMap?.[path] ?? path)
							.filter((p) => !p.startsWith("staging/"));
						movedImagePaths = Object.values(moveResult.pathMap);
						imagesJson =
							updatedPaths.length > 0 ? JSON.stringify(updatedPaths) : "";
					}
				} else {
					imagesJson = imagePaths.length > 0 ? JSON.stringify(imagePaths) : "";
				}
			}

			// === ALL DB WRITES IN A SINGLE TRANSACTION ===

			const attributesJson =
				productData.attributes && productData.attributes.length > 0
					? JSON.stringify(productData.attributes)
					: null;

			const newProduct = await db.transaction(async (tx) => {
				// Insert main product
				const insertedProducts = await tx
					.insert(products)
					.values({
						name: productData.name,
						slug: productData.slug,
						sku: productData.sku || null,
						description: productData.description || null,
						importantNote: productData.importantNote || null,
						tags: productData.tags?.length
							? JSON.stringify(productData.tags)
							: null,
						price: parseFloat(productData.price),
						squareMetersPerPack: productData.squareMetersPerPack
							? parseFloat(productData.squareMetersPerPack)
							: null,
						unitOfMeasurement: productData.unitOfMeasurement,
						categorySlug: productData.categorySlug || null,
						brandSlug: productData.brandSlug || null,
						collectionSlug: productData.collectionSlug || null,
						isActive: productData.isActive,
						isFeatured: productData.isFeatured,
						discount: productData.discount ?? null,
						hasVariations: productData.hasVariations,
						images: imagesJson,
						productAttributes: attributesJson,
						dimensions: productData.dimensions || null,
						createdAt: new Date(),
					})
					.returning();

				const product = insertedProducts[0];

				// --- All junction inserts in parallel ---
				const junctionOps: Promise<void>[] = [];

				// Brand junction
				if (productData.brandSlug) {
					junctionOps.push(
						tx
							.insert(productBrands)
							.values({
								productId: product.id,
								brandSlug: productData.brandSlug,
								createdAt: new Date(),
							})
							.then(() => {}),
					);
				}

				// Collection junction
				if (productData.collectionSlug) {
					junctionOps.push(
						tx
							.insert(productCollections)
							.values({
								productId: product.id,
								collectionSlug: productData.collectionSlug,
								createdAt: new Date(),
							})
							.then(() => {}),
					);
				}

				// Store locations
				if (
					productData.storeLocationIds &&
					productData.storeLocationIds.length > 0
				) {
					junctionOps.push(
						tx
							.insert(productStoreLocations)
							.values(
								productData.storeLocationIds.map((locationId: number) => ({
									productId: product.id,
									storeLocationId: locationId,
									createdAt: new Date(),
								})),
							)
							.then(() => {}),
					);
				}

				// Variations
				if (productData.hasVariations && productData.variations?.length) {
					junctionOps.push(
						(async () => {
							const insertedVariations = await tx
								.insert(productVariations)
								.values(
									productData.variations?.map((v) => ({
										productId: product.id,
										sku: v.sku,
										price: parseFloat(v.price.toString()),
										sort: v.sort || 0,
										discount: v.discount
											? parseInt(v.discount.toString(), 10)
											: null,
										variationAttributes:
											v.attributes && v.attributes.length > 0
												? JSON.stringify(v.attributes)
												: null,
										createdAt: new Date(),
									})),
								)
								.returning();

							const attributesToInsert = productData.variations?.flatMap(
								(variation, index) => {
									const insertedVariation = insertedVariations[index];
									return (
										variation.attributes?.map((attr) => ({
											productVariationId: insertedVariation.id,
											attributeId: attr.attributeId,
											value: attr.value,
											createdAt: new Date(),
										})) || []
									);
								},
							);

							if (attributesToInsert.length > 0) {
								await tx.insert(variationAttributes).values(attributesToInsert);
							}
						})(),
					);
				}

				// Product attribute junction table (standardized attrs)
				if (productData.attributes && productData.attributes.length > 0) {
					junctionOps.push(
						(async () => {
							const { attributes: attributeDefinitions } =
								await getAttributeMappings();
							const attributeDefMap = new Map(
								attributeDefinitions.map((attr) => [attr.id, attr]),
							);

							const standardizedAttrs = productData.attributes?.filter(
								(attr) => {
									const attrId = parseInt(attr.attributeId, 10);
									const attrDef = attributeDefMap.get(attrId);
									return attrDef?.valueType === "standardized";
								},
							);

							if (standardizedAttrs.length > 0) {
								const attributeValuePairs = standardizedAttrs.map((attr) => {
									const attrId = parseInt(attr.attributeId, 10);
									const values = attr.value
										.split(",")
										.map((v) => v.trim())
										.filter(Boolean);
									return { attributeId: attrId, values };
								});

								// Safe cast: tx has the same query API (select/insert/delete) as db
								const batchValueIds = await getBatchValueIds(
									tx as unknown as Parameters<typeof getBatchValueIds>[0],
									attributeValuePairs,
								);

								const junctionRows: Array<{
									productId: number;
									attributeId: number;
									valueId: number;
									createdAt: Date;
								}> = [];

								for (const pair of attributeValuePairs) {
									const valueIdMap = batchValueIds.get(pair.attributeId);
									if (!valueIdMap) continue;
									for (const value of pair.values) {
										const valueId = valueIdMap.get(value);
										if (valueId) {
											junctionRows.push({
												productId: product.id,
												attributeId: pair.attributeId,
												valueId,
												createdAt: new Date(),
											});
										}
									}
								}

								if (junctionRows.length > 0) {
									await tx.insert(productAttributeValues).values(junctionRows);
								}
							}
						})(),
					);
				}

				await Promise.all(junctionOps);

				return product;
			});

			return {
				message: "Product created successfully",
				product: newProduct,
			};
		} catch (error) {
			console.error("Error creating product:", error);

			// Cleanup: delete moved images if product creation failed
			if (movedImagePaths.length > 0) {
				try {
					const bucket = getStorageBucket();
					await Promise.allSettled(
						movedImagePaths.map(async (imagePath) => {
							try {
								const storageKey = getProductImageStorageKey(imagePath);
								await bucket.delete(storageKey);
								console.log(`Cleaned up orphaned image: ${storageKey}`);
							} catch (deleteError) {
								console.warn(
									`Failed to cleanup orphaned image ${imagePath}:`,
									deleteError,
								);
							}
						}),
					);
				} catch (cleanupError) {
					console.error("Error during image cleanup:", cleanupError);
				}
			}

			// Map error to HTTP status
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else if (
				error instanceof Error &&
				error.message.includes("Ошибки валидации")
			) {
				setResponseStatus(400);
			} else {
				setResponseStatus(500);
			}

			throw new Error(
				error instanceof Error ? error.message : "Failed to create product",
			);
		}
	});
