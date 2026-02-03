import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { getStorageBucket } from "~/utils/storage";
import { getProductImageStorageKey } from "./moveStagingImages";

interface DeleteImageInput {
	filename: string; // Full path in R2 (e.g., "products/image.jpg")
	currentImages?: string; // Optional: comma-separated list of current images to check for duplicates
}

export const deleteProductImage = createServerFn({ method: "POST" })
	.inputValidator((data: DeleteImageInput) => data)
	.handler(async ({ data }) => {
		try {
			const { filename, currentImages } = data;

			if (!filename) {
				setResponseStatus(400);
				throw new Error("No filename provided");
			}

			// Check if this image is still referenced in the current images list
			// This prevents deleting files that are still used (duplicate references)
			if (currentImages) {
				// Parse current images (handle both comma-separated and JSON array formats)
				let imageArray: string[] = [];
				try {
					// Try to parse as JSON array first
					imageArray = JSON.parse(currentImages);
				} catch {
					// If not JSON, treat as comma-separated string
					imageArray = currentImages
						.split(",")
						.map((img) => img.trim())
						.filter(Boolean);
				}

				// Check if the filename still exists in the current images
				const stillReferenced = imageArray.some(
					(img) => img.trim() === filename.trim(),
				);

				if (stillReferenced) {
					console.log(
						`⏭️ Skipping deletion of ${filename} - still referenced in current images`,
					);
					return {
						success: true,
						message: "Image not deleted - still referenced in product",
						skipped: true,
					};
				}
			}

			const bucket = getStorageBucket();
			const storageKey = getProductImageStorageKey(filename);

			// Check if file exists
			const fileExists = await bucket.head(storageKey);

			if (!fileExists) {
				// File doesn't exist, but that's okay - maybe already deleted
				console.warn(`File not found in R2: ${storageKey}`);
				return {
					success: true,
					message: "File not found (may have been already deleted)",
				};
			}

			// Delete from R2
			await bucket.delete(storageKey);

			return {
				success: true,
				message: "Image deleted successfully",
			};
		} catch (error) {
			console.error("Error deleting image:", error);
			setResponseStatus(500);
			throw new Error(
				error instanceof Error ? error.message : "Failed to delete image",
			);
		}
	});
