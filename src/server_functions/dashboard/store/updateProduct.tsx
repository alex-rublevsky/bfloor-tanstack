import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
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
import type { UpdateProductInput } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getAttributeMappings } from "~/utils/attributeMapping";
import { getBatchValueIds } from "~/utils/attributeValueLookup";
import { getStorageBucket } from "~/utils/storage";
import { validateAttributeValues } from "~/utils/validateAttributeValues";
import {
	type MoveStagingImagesResult,
	moveStagingImagesWithBucket,
} from "./moveStagingImages";

/**
 * Update product — optimized with client-side change detection + database transactions.
 *
 * Receives only changed fields from frontend, validates, then applies all
 * writes inside a single transaction so the database stays consistent
 * even if one operation fails.
 */
export const updateProduct = createServerFn({ method: "POST" })
	.inputValidator((data: UpdateProductInput) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id: productId, changes } = data;

			// === EARLY VALIDATION (outside transaction — read-only) ===

			if (Number.isNaN(productId)) {
				throw new ApiError("Invalid product ID", 400);
			}

			if (changes._changeCount === 0) {
				return {
					success: true,
					message: "No changes to apply",
					updatedFields: [],
				};
			}

			// Validate slug uniqueness
			if ("slug" in changes && changes.slug) {
				const duplicateSlug = await db
					.select()
					.from(products)
					.where(eq(products.slug, changes.slug))
					.limit(1);

				if (duplicateSlug[0] && duplicateSlug[0].id !== productId) {
					throw new ApiError("A product with this slug already exists", 400);
				}
			}

			// Validate attributes
			if ("attributes" in changes && changes.attributes?.length) {
				const validationErrors = await validateAttributeValues(
					db,
					changes.attributes,
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

			// Validate variations
			if ("variations" in changes && changes.variations?.length) {
				const incomingVariations = changes.variations;

				for (const [index, variation] of incomingVariations.entries()) {
					const price = parseFloat(variation.price.toString());
					if (Number.isNaN(price) || price < 0) {
						throw new ApiError(
							`Variation ${index + 1}: Invalid price. Must be a non-negative number`,
							400,
						);
					}
					if (variation.discount !== null && variation.discount !== undefined) {
						const discount = parseInt(variation.discount.toString(), 10);
						if (Number.isNaN(discount) || discount < 0 || discount > 100) {
							throw new ApiError(
								`Variation ${index + 1}: Invalid discount. Must be between 0 and 100`,
								400,
							);
						}
					}
				}

				// Check for duplicate variation IDs
				const seenIds = new Set<number>();
				for (const variation of incomingVariations) {
					if (variation.id !== undefined) {
						if (seenIds.has(variation.id)) {
							throw new ApiError(
								`Duplicate variation IDs found: ${variation.id}`,
								400,
							);
						}
						seenIds.add(variation.id);
					}
				}

				// Validate variation attributes
				const allVariationAttributes = incomingVariations.flatMap(
					(v) => v.attributes || [],
				);
				if (allVariationAttributes.length > 0) {
					const varErrors = await validateAttributeValues(
						db,
						allVariationAttributes,
					);
					if (varErrors.length > 0) {
						const errorMessages = varErrors.map((err) => err.error).join("; ");
						throw new ApiError(
							`Ошибки валидации атрибутов вариаций: ${errorMessages}`,
							400,
						);
					}
				}
			}

			// === MOVE STAGING IMAGES (outside transaction — storage I/O) ===

			let imagePaths: string[] | undefined;

			if ("images" in changes && changes.images) {
				imagePaths = changes.images
					.split(",")
					.map((img) => img.trim())
					.filter((img) => img.length > 0);

				const hasStagingImages = imagePaths.some((path) =>
					path.startsWith("staging/"),
				);

				if (hasStagingImages) {
					let categorySlug = changes.categorySlug;
					let productName = changes.name;
					let productSlug = changes.slug;

					if (!categorySlug || !productName || !productSlug) {
						const existing = await db
							.select({
								categorySlug: products.categorySlug,
								name: products.name,
								slug: products.slug,
							})
							.from(products)
							.where(eq(products.id, productId))
							.limit(1);

						if (!existing[0]) {
							throw new ApiError("Product not found", 404);
						}

						categorySlug =
							categorySlug ?? existing[0].categorySlug ?? undefined;
						productName = productName ?? existing[0].name;
						productSlug = productSlug ?? existing[0].slug;
					}

					const bucket = getStorageBucket();
					const moveResult: MoveStagingImagesResult =
						await moveStagingImagesWithBucket(bucket, {
							imagePaths,
							finalFolder: "products",
							categorySlug: categorySlug ?? undefined,
							productName: productName ?? "",
							slug: productSlug ?? "",
						});

					if (moveResult?.pathMap) {
						for (let i = 0; i < imagePaths.length; i++) {
							const path = imagePaths[i];
							const finalPath =
								moveResult.pathMap[path] ??
								moveResult.pathMap[path.trim()] ??
								path;
							if (finalPath.startsWith("staging/")) {
								imagePaths.splice(i, 1);
								i--;
							} else {
								imagePaths[i] = finalPath;
							}
						}
					}
				}
			}

			// === BUILD ALL UPDATES, THEN EXECUTE IN A SINGLE TRANSACTION ===

			await db.transaction(async (tx) => {
				// --- Main product table ---
				const mainUpdates: Record<string, unknown> = {};

				if ("name" in changes) mainUpdates.name = changes.name;
				if ("slug" in changes) mainUpdates.slug = changes.slug;
				if ("sku" in changes) mainUpdates.sku = changes.sku?.trim() || null;
				if ("description" in changes)
					mainUpdates.description = changes.description || null;
				if ("importantNote" in changes)
					mainUpdates.importantNote = changes.importantNote || null;
				if ("price" in changes)
					mainUpdates.price = parseFloat(changes.price ?? "0");
				if ("squareMetersPerPack" in changes)
					mainUpdates.squareMetersPerPack = changes.squareMetersPerPack
						? parseFloat(changes.squareMetersPerPack)
						: null;
				if ("unitOfMeasurement" in changes)
					mainUpdates.unitOfMeasurement = changes.unitOfMeasurement;
				if ("categorySlug" in changes)
					mainUpdates.categorySlug = changes.categorySlug || null;
				if ("brandSlug" in changes)
					mainUpdates.brandSlug = changes.brandSlug || null;
				if ("collectionSlug" in changes)
					mainUpdates.collectionSlug = changes.collectionSlug || null;
				if ("isActive" in changes) mainUpdates.isActive = changes.isActive;
				if ("isFeatured" in changes)
					mainUpdates.isFeatured = changes.isFeatured;
				if ("discount" in changes)
					mainUpdates.discount = changes.discount || null;
				if ("hasVariations" in changes)
					mainUpdates.hasVariations = changes.hasVariations;
				if ("dimensions" in changes)
					mainUpdates.dimensions = changes.dimensions || null;

				if ("tags" in changes) {
					mainUpdates.tags =
						changes.tags && changes.tags.length > 0
							? JSON.stringify(changes.tags)
							: null;
				}

				if ("attributes" in changes) {
					mainUpdates.productAttributes =
						changes.attributes && changes.attributes.length > 0
							? JSON.stringify(changes.attributes)
							: null;
				}

				if (imagePaths !== undefined) {
					mainUpdates.images =
						imagePaths.length > 0 ? JSON.stringify(imagePaths) : "";
				}

				// --- Execute main product update ---
				if (Object.keys(mainUpdates).length > 0) {
					await tx
						.update(products)
						.set(mainUpdates)
						.where(eq(products.id, productId));
				}

				// --- Junction tables (run in parallel within the transaction) ---
				const junctionOps: Promise<void>[] = [];

				// Store locations
				if ("storeLocationIds" in changes) {
					junctionOps.push(
						(async () => {
							const locationIds = (changes.storeLocationIds || []).filter(
								(id): id is number =>
									typeof id === "number" && !Number.isNaN(id),
							);
							await tx
								.delete(productStoreLocations)
								.where(eq(productStoreLocations.productId, productId));
							if (locationIds.length > 0) {
								await tx.insert(productStoreLocations).values(
									locationIds.map((locationId) => ({
										productId,
										storeLocationId: locationId,
										createdAt: new Date(),
									})),
								);
							}
						})(),
					);
				}

				// Product attributes junction
				if ("attributes" in changes) {
					junctionOps.push(
						(async () => {
							await tx
								.delete(productAttributeValues)
								.where(eq(productAttributeValues.productId, productId));

							const { attributes: attributeDefinitions } =
								await getAttributeMappings();
							const attributeDefMap = new Map(
								attributeDefinitions.map((attr) => [attr.id, attr]),
							);

							const standardizedAttrs = (changes.attributes || []).filter(
								(attr: { attributeId: string; value: string }) => {
									const attrId = parseInt(attr.attributeId, 10);
									const attrDef = attributeDefMap.get(attrId);
									return attrDef?.valueType === "standardized";
								},
							);

							if (standardizedAttrs.length > 0) {
								const attributeValuePairs = standardizedAttrs.map(
									(attr: { attributeId: string; value: string }) => {
										const attrId = parseInt(attr.attributeId, 10);
										const values = attr.value
											.split(",")
											.map((v: string) => v.trim())
											.filter(Boolean);
										return { attributeId: attrId, values };
									},
								);

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
												productId,
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

				// Brand junction
				if ("brandSlug" in changes) {
					junctionOps.push(
						(async () => {
							await tx
								.delete(productBrands)
								.where(eq(productBrands.productId, productId));
							if (changes.brandSlug) {
								await tx.insert(productBrands).values({
									productId,
									brandSlug: changes.brandSlug,
									createdAt: new Date(),
								});
							}
						})(),
					);
				}

				// Collection junction
				if ("collectionSlug" in changes) {
					junctionOps.push(
						(async () => {
							await tx
								.delete(productCollections)
								.where(eq(productCollections.productId, productId));
							if (changes.collectionSlug) {
								await tx.insert(productCollections).values({
									productId,
									collectionSlug: changes.collectionSlug,
									createdAt: new Date(),
								});
							}
						})(),
					);
				}

				// Variations
				if ("variations" in changes) {
					junctionOps.push(
						(async () => {
							const incomingVariations = changes.variations || [];
							const shouldHaveVariations = changes.hasVariations ?? true;

							// Fetch existing variations
							const existingRows = await tx
								.select({ id: productVariations.id })
								.from(productVariations)
								.where(eq(productVariations.productId, productId));
							const existingIds = new Set(existingRows.map((r) => r.id));

							// Classify incoming variations
							const toUpdate: typeof incomingVariations = [];
							const toInsert: typeof incomingVariations = [];

							for (const variation of incomingVariations) {
								if (variation.id !== undefined) {
									toUpdate.push(variation);
								} else {
									toInsert.push(variation);
								}
							}

							// Determine deletions
							const incomingIds = new Set(
								incomingVariations
									.map((v) => v.id)
									.filter((id): id is number => id !== undefined),
							);
							const toDelete = Array.from(existingIds).filter(
								(id) => !shouldHaveVariations || !incomingIds.has(id),
							);

							// Update existing variations
							if (toUpdate.length > 0) {
								const updatingIds = toUpdate.map((v) => v.id!);

								// Delete old attributes for variations being updated
								await tx
									.delete(variationAttributes)
									.where(
										inArray(
											variationAttributes.productVariationId,
											updatingIds,
										),
									);

								// Update variations + insert new attributes in parallel
								const allAttrsToInsert = toUpdate.flatMap((variation) => {
									const attrs = variation.attributes || [];
									return attrs.map((attr) => ({
										productVariationId: variation.id!,
										attributeId: attr.attributeId,
										value: attr.value,
										createdAt: new Date(),
									}));
								});

								await Promise.all([
									...toUpdate.map((variation) =>
										tx
											.update(productVariations)
											.set({
												sku: variation.sku,
												price: parseFloat(variation.price.toString()),
												discount:
													variation.discount !== null &&
													variation.discount !== undefined
														? parseInt(variation.discount.toString(), 10)
														: null,
												sort: variation.sort,
												variationAttributes:
													variation.attributes &&
													variation.attributes.length > 0
														? JSON.stringify(variation.attributes)
														: null,
											})
											.where(eq(productVariations.id, variation.id!)),
									),
									allAttrsToInsert.length > 0
										? tx.insert(variationAttributes).values(allAttrsToInsert)
										: Promise.resolve(),
								]);
							}

							// Insert new variations
							if (toInsert.length > 0) {
								const insertedVariations = await tx
									.insert(productVariations)
									.values(
										toInsert.map((v) => ({
											productId,
											sku: v.sku,
											price: parseFloat(v.price.toString()),
											discount:
												v.discount !== null && v.discount !== undefined
													? parseInt(v.discount.toString(), 10)
													: null,
											sort: v.sort,
											variationAttributes:
												v.attributes && v.attributes.length > 0
													? JSON.stringify(v.attributes)
													: null,
											createdAt: new Date(),
										})),
									)
									.returning();

								const attrsToInsert = toInsert.flatMap((variation, index) =>
									(variation.attributes || []).map((attr) => ({
										productVariationId: insertedVariations[index].id,
										attributeId: attr.attributeId,
										value: attr.value,
										createdAt: new Date(),
									})),
								);

								if (attrsToInsert.length > 0) {
									await tx.insert(variationAttributes).values(attrsToInsert);
								}
							}

							// Delete removed variations
							if (toDelete.length > 0) {
								await tx
									.delete(variationAttributes)
									.where(
										inArray(variationAttributes.productVariationId, toDelete),
									);
								await tx
									.delete(productVariations)
									.where(inArray(productVariations.id, toDelete));
							}
						})(),
					);
				}

				await Promise.all(junctionOps);
			});

			return {
				success: true,
				message: "Product updated successfully",
				updatedFields: changes._changedFields,
			};
		} catch (error) {
			// Map error to HTTP status
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				setResponseStatus(500);
			}
			throw error;
		}
	});
