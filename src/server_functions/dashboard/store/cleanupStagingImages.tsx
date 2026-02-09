import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { getStorageBucket } from "~/utils/storage";

interface CleanupStagingImagesInput {
	imagePaths: string[]; // Array of staging image paths to delete
}

/**
 * Cleanup staging images by deleting them from R2
 * This is called when drawer closes without saving or on page unload
 */
export const cleanupStagingImages = createServerFn({ method: "POST" })
	.inputValidator((data: CleanupStagingImagesInput) => data)
	.handler(async ({ data }) => {
		try {
			const { imagePaths } = data;

			if (!imagePaths || imagePaths.length === 0) {
				return { success: true, deletedCount: 0 };
			}

			const bucket = getStorageBucket();

			// Filter to only staging images
			const stagingImages = imagePaths.filter((path) =>
				path.startsWith("images/staging/"),
			);

			if (stagingImages.length === 0) {
				return { success: true, deletedCount: 0 };
			}

			// Delete all staging images in parallel
			const deleteResults = await Promise.allSettled(
				stagingImages.map(async (imagePath) => {
					try {
						await bucket.delete(imagePath);
						return { path: imagePath, success: true };
					} catch (error) {
						console.warn(`Failed to delete staging image ${imagePath}:`, error);
						return { path: imagePath, success: false };
					}
				}),
			);

			const deletedCount = deleteResults.filter(
				(r) => r.status === "fulfilled" && r.value.success,
			).length;

			return {
				success: true,
				deletedCount,
				totalRequested: stagingImages.length,
			};
		} catch (error) {
			console.error("Error cleaning up staging images:", error);
			setResponseStatus(500);
			throw new Error(
				error instanceof Error
					? error.message
					: "Failed to cleanup staging images",
			);
		}
	});
