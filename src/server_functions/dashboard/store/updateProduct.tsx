import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
import { DB } from "~/db";
import {
	productAttributeValues,
	productStoreLocations,
	products,
	productVariations,
	variationAttributes,
} from "~/schema";
import type { ProductFormData } from "~/types";
import { getAttributeMappings } from "~/utils/attributeMapping";
import { getBatchValueIds } from "~/utils/attributeValueLookup";
import { validateAttributeValues } from "~/utils/validateAttributeValues";
import { moveStagingImages } from "./moveStagingImages";

export const updateProduct = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; data: ProductFormData }) => data)
	.handler(async ({ data }) => {
		// Track response status to avoid overwriting specific error codes
		let responseStatusSet = false;

		try {
			const db = DB();
			const { id: productId, data: productData } = data;

			// Validation
			if (Number.isNaN(productId)) {
				setResponseStatus(400);
				responseStatusSet = true;
				throw new Error("Invalid product ID");
			}

			if (!productData.name || !productData.slug || !productData.price) {
				setResponseStatus(400);
				responseStatusSet = true;
				throw new Error(
					"Missing required fields: name, slug, and price are required",
				);
			}

			if (!productData.unitOfMeasurement) {
				setResponseStatus(400);
				responseStatusSet = true;
				throw new Error("Unit of measurement is required");
			}

			// Fetch existing product and check for duplicate slug
			const normalizedProductSku = productData.sku?.trim() || null;

			const [existingProduct, duplicateSlug] = await Promise.all([
				db.select().from(products).where(eq(products.id, productId)).limit(1),
				db
					.select()
					.from(products)
					.where(eq(products.slug, productData.slug))
					.limit(1),
			]);

			if (!existingProduct[0]) {
				setResponseStatus(404);
				responseStatusSet = true;
				throw new Error("Product not found");
			}

			if (duplicateSlug[0] && duplicateSlug[0].id !== productId) {
				setResponseStatus(400);
				responseStatusSet = true;
				throw new Error("A product with this slug already exists");
			}

			const existingProductData = existingProduct[0];

			// Helper to preserve existing value if new value is empty string
			const preserveIfEmpty = (
				newValue: string | null | undefined,
				existingValue: string | null | undefined,
			): string | null => {
				if (newValue && newValue.trim() !== "") {
					return newValue;
				}
				if (newValue === "") {
					return existingValue || null;
				}
				return null;
			};

			// Validate standardized attribute values before saving
			if (productData.attributes?.length) {
				const validationErrors = await validateAttributeValues(
					db,
					productData.attributes,
				);

				if (validationErrors.length > 0) {
					setResponseStatus(400);
					responseStatusSet = true;
					const errorMessages = validationErrors
						.map((err) => err.error)
						.join("; ");
					throw new Error(`Ошибки валидации атрибутов: ${errorMessages}`);
				}
			}

			// Store attributes as array format for consistency
			// Format: [{"attributeId": "5", "value": "Дерево"}]
			const attributesJson =
				productData.attributes && productData.attributes.length > 0
					? JSON.stringify(productData.attributes)
					: null;

			// Validate and prepare variations before any database changes
			const shouldHaveVariations = productData.hasVariations === true;
			const incomingVariations = shouldHaveVariations
				? productData.variations || []
				: [];

			// Validate variation data if variations are provided
			if (incomingVariations.length > 0) {
				// Validate basic variation fields
				for (const [index, variation] of incomingVariations.entries()) {
					const price = parseFloat(variation.price.toString());
					if (Number.isNaN(price) || price < 0) {
						setResponseStatus(400);
						responseStatusSet = true;
						throw new Error(
							`Variation ${index + 1}: Invalid price. Must be a non-negative number`,
						);
					}

					if (variation.discount !== null && variation.discount !== undefined) {
						const discount = parseInt(variation.discount.toString(), 10);
						if (Number.isNaN(discount) || discount < 0 || discount > 100) {
							setResponseStatus(400);
							responseStatusSet = true;
							throw new Error(
								`Variation ${index + 1}: Invalid discount. Must be between 0 and 100`,
							);
						}
					}
				}

				// Check for duplicate IDs within incoming variations
				const seenIds = new Set<number>();
				const duplicateIds: number[] = [];
				for (const variation of incomingVariations) {
					if (variation.id !== undefined) {
						if (seenIds.has(variation.id)) {
							duplicateIds.push(variation.id);
						} else {
							seenIds.add(variation.id);
						}
					}
				}
				if (duplicateIds.length > 0) {
					setResponseStatus(400);
					responseStatusSet = true;
					throw new Error(
						`Duplicate variation IDs found: ${duplicateIds.join(", ")}`,
					);
				}

				// Validate variation attributes
				const allVariationAttributes = incomingVariations.flatMap(
					(v) => v.attributes || [],
				);
				if (allVariationAttributes.length > 0) {
					const validationErrors = await validateAttributeValues(
						db,
						allVariationAttributes,
					);

					if (validationErrors.length > 0) {
						setResponseStatus(400);
						responseStatusSet = true;
						const errorMessages = validationErrors
							.map((err) => err.error)
							.join("; ");
						throw new Error(
							`Ошибки валидации атрибутов вариаций: ${errorMessages}`,
						);
					}
				}
			}

			// All validation passed - now process images
			// Parse image paths once
			const imagePaths =
				productData.images
					?.split(",")
					.map((img) => img.trim())
					.filter(Boolean) ?? [];

			// Move staging images to final location if any exist
			if (imagePaths.length > 0) {
				const hasStagingImages = imagePaths.some((path) =>
					path.startsWith("staging/"),
				);

				if (hasStagingImages) {
					try {
						const moveResult = await moveStagingImages({
							data: {
								imagePaths,
								finalFolder: "products",
								categorySlug: productData.categorySlug,
								productName: productData.name,
								slug: productData.slug,
							},
						});

						if (moveResult?.pathMap) {
							// Update paths in place with final locations
							imagePaths.forEach((path, index) => {
								imagePaths[index] = moveResult.pathMap?.[path] || path;
							});
						}
					} catch (imageError) {
						// If image move fails, fail the entire operation to maintain consistency
						setResponseStatus(500);
						responseStatusSet = true;
						throw new Error(
							`Failed to move staging images: ${
								imageError instanceof Error
									? imageError.message
									: String(imageError)
							}`,
						);
					}
				}
			}

			// Convert to JSON array for database storage
			const imagesJson =
				imagePaths.length > 0 ? JSON.stringify(imagePaths) : "";

			// Fetch existing variations with their attributes for efficient comparison
			const existingVariationsWithAttrs = await db
				.select({
					variation: productVariations,
					attribute: variationAttributes,
				})
				.from(productVariations)
				.leftJoin(
					variationAttributes,
					eq(variationAttributes.productVariationId, productVariations.id),
				)
				.where(eq(productVariations.productId, productId));

			// Group existing variations by ID with their attributes
			const existingVariationsMap = new Map<
				number,
				{
					variation: typeof productVariations.$inferSelect;
					attributes: Array<{
						attributeId: string;
						value: string;
					}>;
				}
			>();

			for (const row of existingVariationsWithAttrs) {
				const varId = row.variation.id;
				if (!existingVariationsMap.has(varId)) {
					existingVariationsMap.set(varId, {
						variation: row.variation,
						attributes: [],
					});
				}
				if (row.attribute) {
					const variationData = existingVariationsMap.get(varId);
					if (variationData) {
						variationData.attributes.push({
							attributeId: row.attribute.attributeId,
							value: row.attribute.value,
						});
					}
				}
			}

			// Separate incoming variations into updates and inserts
			const variationsToUpdate: Array<{
				id: number;
				data: Omit<typeof productVariations.$inferInsert, "createdAt" | "id">;
				attributes: Array<{ attributeId: string; value: string }>;
			}> = [];
			const variationsToInsert: Array<{
				data: typeof productVariations.$inferInsert;
				attributes: Array<{ attributeId: string; value: string }>;
			}> = [];

			for (const incomingVar of incomingVariations) {
				const varAttributes = incomingVar.attributes || [];
				// Normalize variation SKU: allow empty strings (SKU is optional)
				const normalizedVariationSku = incomingVar.sku?.trim() || "";
				const price = parseFloat(incomingVar.price.toString());
				const discount =
					incomingVar.discount !== null && incomingVar.discount !== undefined
						? parseInt(incomingVar.discount.toString(), 10)
						: null;

				// If variation has an ID and exists in this product, it's an update
				if (incomingVar.id && existingVariationsMap.has(incomingVar.id)) {
					const updateData = {
						productId,
						sku: normalizedVariationSku,
						price,
						sort: incomingVar.sort || 0,
						discount,
					};
					variationsToUpdate.push({
						id: incomingVar.id,
						data: updateData,
						attributes: varAttributes,
					});
				} else {
					// No ID or ID doesn't exist = new variation
					const insertData = {
						productId,
						sku: normalizedVariationSku,
						price,
						sort: incomingVar.sort || 0,
						discount,
						createdAt: new Date(),
					};
					variationsToInsert.push({
						data: insertData,
						attributes: varAttributes,
					});
				}
			}

			// Determine which existing variations should be deleted
			const incomingVariationIds = new Set(
				incomingVariations
					.map((v) => v.id)
					.filter((id): id is number => id !== undefined),
			);
			const variationsToDelete = Array.from(
				existingVariationsMap.keys(),
			).filter((id) => !shouldHaveVariations || !incomingVariationIds.has(id));

			// Helper functions for database operations
			const handleVariations = async () => {
				// Update existing variations
				if (variationsToUpdate.length > 0) {
					const updatingVariationIds = variationsToUpdate.map((v) => v.id);

					// Batch delete all attributes for variations being updated
					await db
						.delete(variationAttributes)
						.where(
							inArray(
								variationAttributes.productVariationId,
								updatingVariationIds,
							),
						);

					// Update variations and insert attributes in parallel
					await Promise.all([
						// Update all variations in parallel
						...variationsToUpdate.map(({ id, data }) =>
							db
								.update(productVariations)
								.set(data)
								.where(eq(productVariations.id, id)),
						),
						// Insert all attributes in parallel (if any)
						(async () => {
							const allAttributesToInsert = variationsToUpdate.flatMap(
								({ id, attributes }) =>
									attributes.map((attr) => ({
										productVariationId: id,
										attributeId: attr.attributeId,
										value: attr.value,
										createdAt: new Date(),
									})),
							);

							if (allAttributesToInsert.length > 0) {
								await db
									.insert(variationAttributes)
									.values(allAttributesToInsert);
							}
						})(),
					]);
				}

				// Insert new variations
				if (variationsToInsert.length > 0) {
					const insertedVariations = await db
						.insert(productVariations)
						.values(variationsToInsert.map((v) => v.data))
						.returning();

					// Insert attributes for new variations
					const attributesToInsert = variationsToInsert.flatMap(
						(variation, index) =>
							variation.attributes.map((attr) => ({
								productVariationId: insertedVariations[index].id,
								attributeId: attr.attributeId,
								value: attr.value,
								createdAt: new Date(),
							})),
					);

					if (attributesToInsert.length > 0) {
						await db.insert(variationAttributes).values(attributesToInsert);
					}
				}

				// Delete variations that are no longer needed
				if (variationsToDelete.length > 0) {
					// Delete attributes first (cascade should handle this, but being explicit)
					await db
						.delete(variationAttributes)
						.where(
							inArray(
								variationAttributes.productVariationId,
								variationsToDelete,
							),
						);

					// Delete variations
					await db
						.delete(productVariations)
						.where(inArray(productVariations.id, variationsToDelete));
				}
			};

			const handleStoreLocations = async () => {
				// Delete existing connections
				await db
					.delete(productStoreLocations)
					.where(eq(productStoreLocations.productId, productId));

				// Add new connections if provided
				if (productData.storeLocationIds?.length) {
					// Validate and filter to ensure all IDs are numbers
					const validLocationIds = productData.storeLocationIds.filter(
						(id): id is number => typeof id === "number" && !Number.isNaN(id),
					);

					if (validLocationIds.length > 0) {
						await db.insert(productStoreLocations).values(
							validLocationIds.map((locationId) => ({
								productId,
								storeLocationId: locationId,
								createdAt: new Date(),
							})),
						);
					}
				}
			};

			// Handle product attributes - update junction table for standardized attributes
			const handleProductAttributes = async () => {
				if (!productData.attributes || productData.attributes.length === 0) {
					// No attributes, delete all existing junction table rows
					await db
						.delete(productAttributeValues)
						.where(eq(productAttributeValues.productId, productId));
					return;
				}

				// Get attribute mappings to determine which are standardized
				const { attributes: attributeDefinitions } =
					await getAttributeMappings();
				const attributeDefMap = new Map(
					attributeDefinitions.map((attr) => [attr.id, attr]),
				);

				// Filter for standardized attributes only
				const standardizedAttrs = productData.attributes.filter((attr) => {
					const attrId = parseInt(attr.attributeId, 10);
					const attrDef = attributeDefMap.get(attrId);
					return attrDef?.valueType === "standardized";
				});

				// Delete old junction table rows
				await db
					.delete(productAttributeValues)
					.where(eq(productAttributeValues.productId, productId));

				// Insert new junction table rows
				if (standardizedAttrs.length > 0) {
					// OPTIMIZED: Collect all attribute-value pairs for batch lookup
					const attributeValuePairs = standardizedAttrs.map((attr) => {
						const attrId = parseInt(attr.attributeId, 10);
						const values = attr.value
							.split(",")
							.map((v) => v.trim())
							.filter(Boolean);
						return { attributeId: attrId, values };
					});

					// Single query to get all value IDs at once
					const batchValueIds = await getBatchValueIds(db, attributeValuePairs);

					// Build junction rows
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
									productId: productId,
									attributeId: pair.attributeId,
									valueId: valueId,
									createdAt: new Date(),
								});
							}
						}
					}

					// Batch insert all junction rows
					if (junctionRows.length > 0) {
						await db.insert(productAttributeValues).values(junctionRows);
					}
				}
			};

			// Update product and related data
			const [updatedProductResult] = await Promise.all([
				// Update main product and return updated row to avoid extra query
				db
					.update(products)
					.set({
						name: productData.name,
						slug: productData.slug,
						sku: normalizedProductSku,
						description: productData.description || null,
						importantNote: productData.importantNote || null,
						tags: productData.tags?.length
							? JSON.stringify(productData.tags)
							: null,
						price: parseFloat(productData.price),
						squareMetersPerPack: productData.squareMetersPerPack
							? parseFloat(productData.squareMetersPerPack)
							: null,
						categorySlug: preserveIfEmpty(
							productData.categorySlug,
							existingProductData.categorySlug,
						),
						brandSlug: preserveIfEmpty(
							productData.brandSlug,
							existingProductData.brandSlug,
						),
						collectionSlug: preserveIfEmpty(
							productData.collectionSlug,
							existingProductData.collectionSlug,
						),
						storeLocationId: productData.storeLocationId || null,
						isActive: productData.isActive,
						isFeatured: productData.isFeatured,
						discount: productData.discount || null,
						hasVariations: productData.hasVariations,
						images: imagesJson,
						productAttributes: attributesJson,
						dimensions: preserveIfEmpty(
							productData.dimensions,
							existingProductData.dimensions,
						),
					})
					.where(eq(products.id, productId))
					.returning(),
				handleVariations(),
				handleStoreLocations(),
				handleProductAttributes(),
			]);

			return {
				message: "Product updated successfully",
				product: updatedProductResult[0],
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("Error updating product:", { errorMessage, error });

			// Only set status if it hasn't been set already
			if (!responseStatusSet) {
				setResponseStatus(500);
			}

			throw new Error(`Failed to update product: ${errorMessage}`);
		}
	});
