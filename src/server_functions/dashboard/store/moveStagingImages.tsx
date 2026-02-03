import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import type { StorageBucket } from "~/utils/storage";
import { getStorageBucket } from "~/utils/storage";

export interface MoveStagingImagesInput {
	imagePaths: string[]; // Array of staging image paths to move
	finalFolder: string; // Final folder (e.g., "products")
	categorySlug?: string;
	productName?: string;
	slug?: string;
}

export interface MoveStagingImagesResult {
	success: boolean;
	movedImages: string[];
	pathMap?: Record<string, string>; // Map of staging path -> final path
	failedImages?: string[];
}

/**
 * Product images are stored under the "images/" prefix in the bucket.
 * Paths in the DB are stored without the prefix (e.g. "2025/02/file.jpg").
 * Use this when deleting or otherwise addressing the object in storage.
 */
export function getProductImageStorageKey(path: string): string {
	return path.startsWith("images/") ? path : `images/${path}`;
}

/**
 * Core logic: move staging images to final location using the given bucket.
 * Call this directly from other server code (e.g. updateProduct) so the move
 * runs in the same request and env — avoids server-function HTTP round-trip issues.
 */
export async function moveStagingImagesWithBucket(
	bucket: StorageBucket,
	data: MoveStagingImagesInput,
): Promise<MoveStagingImagesResult> {
	const { imagePaths, finalFolder, categorySlug, productName, slug } = data;

	if (!imagePaths || imagePaths.length === 0) {
		return { success: true, movedImages: [] };
	}

	const sanitizeFilename = (name: string): string =>
		name
			.toLowerCase()
			.replace(/[^a-z0-9.-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

	let finalDirectoryPath = finalFolder;
	if (finalFolder === "country-flags") {
		finalDirectoryPath = "country-flags";
	} else if (finalFolder === "brands") {
		finalDirectoryPath = "brands";
	} else if (finalFolder === "products") {
		const now = new Date();
		finalDirectoryPath = `images/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
	} else if (categorySlug && productName) {
		finalDirectoryPath = `${finalFolder}/${sanitizeFilename(categorySlug)}/${sanitizeFilename(productName)}`;
	} else if (slug) {
		finalDirectoryPath = `${finalFolder}/${slug}`;
	}

	const movedImages: string[] = [];
	const pathMap: Record<string, string> = {};
	const failedImages: string[] = [];

	console.log("🖥️ Moving staging images:", {
		imagePaths,
		finalDirectoryPath,
		count: imagePaths.length,
	});

	for (const stagingPath of imagePaths) {
		try {
			// Check if it's a staging path
			if (!stagingPath.startsWith("staging/")) {
				// Already in final location, skip but add to map
				movedImages.push(stagingPath);
				pathMap[stagingPath] = stagingPath;
				console.log(`Skipping non-staging path: ${stagingPath}`);
				continue;
			}

			console.log(`Moving staging image: ${stagingPath}`);

			// Get the file from staging
			const stagingObject = await bucket.get(stagingPath);
			if (!stagingObject) {
				console.warn(`⚠️ Staging file not found: ${stagingPath}`);
				failedImages.push(stagingPath);
				continue;
			}

			// Extract filename from staging path
			const filename = stagingPath.split("/").pop() || "";
			const finalPath = `${finalDirectoryPath}/${filename}`;

			// Check if final path already exists, add copy number if needed
			let finalPathToUse = finalPath;
			let copyNumber = 0;
			while (await bucket.head(finalPathToUse)) {
				copyNumber++;
				const extIndex = filename.lastIndexOf(".");
				const nameWithoutExt =
					extIndex > 0 ? filename.substring(0, extIndex) : filename;
				const ext = extIndex > 0 ? filename.substring(extIndex) : "";
				finalPathToUse = `${finalDirectoryPath}/${nameWithoutExt}-copy${copyNumber > 1 ? copyNumber : ""}${ext}`;
			}

			// Read staging file content - convert to ArrayBuffer for put operation
			let fileContent: ArrayBuffer;
			if (stagingObject.body && stagingObject.arrayBuffer) {
				// Use the arrayBuffer helper method
				fileContent = await stagingObject.arrayBuffer();
			} else {
				throw new Error(`Staging object has no body: ${stagingPath}`);
			}

			console.log(`📤 Uploading to final location: ${finalPathToUse}`);

			// Upload to final location FIRST (before deleting staging)
			// Preserve all metadata from staging object
			await bucket.put(finalPathToUse, fileContent, {
				httpMetadata: stagingObject.httpMetadata,
				customMetadata: stagingObject.customMetadata,
			});

			console.log(`✅ Put operation completed for: ${finalPathToUse}`);

			// Verify the copy succeeded by checking if file exists in final location
			// Add a small delay to ensure eventual consistency
			await new Promise((resolve) => setTimeout(resolve, 100));

			const verifyFinal = await bucket.head(finalPathToUse);
			if (!verifyFinal) {
				throw new Error(
					`Failed to verify copy: file not found at ${finalPathToUse} after put operation`,
				);
			}

			console.log(`✅ Verified copy exists at: ${finalPathToUse}`, {
				size: verifyFinal.size,
			});

			// Delete from staging AFTER successful copy and verification
			await bucket.delete(stagingPath);

			// Verify deletion succeeded
			const verifyDeleted = await bucket.head(stagingPath);
			if (verifyDeleted) {
				console.warn(
					`⚠️ Warning: Staging file still exists after delete: ${stagingPath}`,
				);
				// Don't fail - file might be cached, but log the warning
			} else {
				console.log(`✅ Verified deletion from staging: ${stagingPath}`);
			}

			// For products, we upload to images/year/month/ but store path without "images/"
			// so that ASSETS_BASE_URL + path still builds the correct URL
			const pathToStore =
				finalFolder === "products" && finalPathToUse.startsWith("images/")
					? finalPathToUse.slice("images/".length)
					: finalPathToUse;
			movedImages.push(pathToStore);
			pathMap[stagingPath] = pathToStore;
		} catch (error) {
			console.error(`❌ Failed to move staging image ${stagingPath}:`, error);
			console.error("Error details:", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			failedImages.push(stagingPath);
			// Continue with other images even if one fails
		}
	}

	console.log("🖥️ Move staging images result:", {
		movedCount: movedImages.length,
		failedCount: failedImages.length,
		pathMap,
		totalRequested: imagePaths.length,
	});

	// If we had staging images but none were moved successfully, that's an error
	const stagingPaths = imagePaths.filter((p) => p.startsWith("staging/"));
	if (
		stagingPaths.length > 0 &&
		movedImages.length === 0 &&
		failedImages.length === stagingPaths.length
	) {
		throw new Error(
			`Failed to move any staging images. All ${failedImages.length} image(s) failed to move.`,
		);
	}

	const result: MoveStagingImagesResult = {
		success: true,
		movedImages,
		pathMap,
	};
	if (failedImages.length > 0) {
		result.failedImages = failedImages;
	}
	return result;
}

/**
 * Server function: move images from staging to final location.
 * For use from the client. From other server code (e.g. updateProduct), call
 * moveStagingImagesWithBucket(getStorageBucket(), data) so the move runs in the same request.
 */
export const moveStagingImages = createServerFn({ method: "POST" })
	.inputValidator((data: MoveStagingImagesInput) => data)
	.handler(async ({ data }) => {
		try {
			const bucket = getStorageBucket();
			return await moveStagingImagesWithBucket(bucket, data);
		} catch (error) {
			console.error("❌ Error moving staging images:", error);
			setResponseStatus(500);
			throw new Error(
				error instanceof Error
					? error.message
					: "Failed to move staging images",
			);
		}
	});

/**
 * Helper function to move a single staging image and return the final path.
 * This simplifies the common pattern of checking if an image is staging,
 * moving it, and extracting the final path.
 */
export async function moveSingleStagingImage(
	imagePath: string | null | undefined,
	options: {
		finalFolder: string;
		slug?: string;
		productName?: string;
		categorySlug?: string;
	},
): Promise<string> {
	if (!imagePath || !imagePath.startsWith("staging/")) {
		return imagePath || "";
	}

	const moveResult = await moveStagingImages({
		data: {
			imagePaths: [imagePath],
			finalFolder: options.finalFolder,
			slug: options.slug,
			productName: options.productName,
			categorySlug: options.categorySlug,
		},
	});

	if (moveResult?.pathMap?.[imagePath]) {
		return moveResult.pathMap[imagePath];
	}

	if (moveResult?.movedImages && moveResult.movedImages.length > 0) {
		return moveResult.movedImages[0];
	}

	// Fallback to original path if move failed
	return imagePath;
}
