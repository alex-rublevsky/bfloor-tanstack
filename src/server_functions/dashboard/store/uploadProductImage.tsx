import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { getStorageBucket, type StorageBucket } from "~/utils/storage";

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5MB
const MAX_SVG_SIZE = 5 * 1024 * 1024; // 5MB for SVG files (they can be larger)
const STAGING_CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/svg+xml",
];

/**
 * Cleanup old staging files (older than 24 hours)
 * This runs on every staging upload to ensure cleanup without cron triggers
 */
async function cleanupOldStagingFiles(
	bucket: StorageBucket,
	folder: string,
): Promise<void> {
	try {
		const stagingPrefix = `images/staging/${folder}/`;
		const cutoffTime = Date.now() - STAGING_CLEANUP_AGE_MS;

		// List all objects in the staging folder
		const objects = await bucket.list({
			prefix: stagingPrefix,
		});

		// Filter and delete old files
		const deletePromises: Promise<void>[] = [];

		for (const object of objects.objects) {
			// Extract timestamp from path: staging/{folder}/{sessionId}/{filename}
			// Or use uploaded date if available
			const uploadedTime = object.uploaded?.getTime() || 0;

			if (uploadedTime > 0 && uploadedTime < cutoffTime) {
				deletePromises.push(
					bucket.delete(object.key).catch((error) => {
						console.warn(
							`Failed to delete old staging file ${object.key}:`,
							error,
						);
					}),
				);
			}
		}

		// Execute deletions in parallel
		await Promise.all(deletePromises);

		if (deletePromises.length > 0) {
			console.log(
				`Cleaned up ${deletePromises.length} old staging file(s) from ${folder}`,
			);
		}
	} catch (error) {
		console.error("Error during staging cleanup:", error);
		// Don't throw - cleanup failures shouldn't break uploads
	}
}

interface UploadImageInput {
	fileData: string; // base64 encoded file
	fileName: string;
	fileType: string;
	fileSize: number;
	folder?: string;
	slug?: string; // product slug for subdirectory organization
	categorySlug?: string; // category slug for proper path structure
	productName?: string; // product name for proper file naming
	isStaging?: boolean; // If true, upload to staging folder
	sessionId?: string; // Session ID for staging folder organization
}

export const uploadProductImage = createServerFn({ method: "POST" })
	.inputValidator((data: UploadImageInput) => data)
	.handler(async ({ data }) => {
		try {
			const {
				fileData,
				fileName,
				fileType,
				fileSize,
				folder = "products",
				slug,
				categorySlug,
				productName,
				isStaging = false,
				sessionId,
			} = data;

			if (!fileData) {
				console.error("🖥️ Server: No file data provided");
				setResponseStatus(400);
				throw new Error("No file provided");
			}

			// Validate file type
			// Also check file extension for SVG (some browsers may not set MIME type correctly)
			const isSvg =
				fileType === "image/svg+xml" || fileName.toLowerCase().endsWith(".svg");
			if (!ALLOWED_TYPES.includes(fileType) && !isSvg) {
				console.error("🖥️ Server: Invalid file type:", fileType);
				setResponseStatus(400);
				throw new Error(
					"Invalid file type. Only JPEG, PNG, WebP, and SVG images are allowed.",
				);
			}

			// Validate file size (SVG files can be larger)
			const maxSize = isSvg ? MAX_SVG_SIZE : MAX_FILE_SIZE;
			if (fileSize > maxSize) {
				console.error("🖥️ Server: File too large:", fileSize, "bytes");
				setResponseStatus(400);
				throw new Error(
					isSvg
						? "SVG file size must be less than 5MB"
						: "File size must be less than 1.5MB",
				);
			}

			// File validation passed

			// Get storage bucket
			const bucket = getStorageBucket();

			// R2 bucket found

			// Cleanup old staging files (older than 24 hours) - runs on every upload
			// This ensures we don't need cron triggers for cleanup
			if (isStaging) {
				try {
					await cleanupOldStagingFiles(bucket, folder);
				} catch (cleanupError) {
					// Log but don't fail the upload if cleanup fails
					console.warn("Failed to cleanup old staging files:", cleanupError);
				}
			}

			// Helper function to sanitize filename
			const sanitizeFilename = (name: string): string => {
				return name
					.toLowerCase()
					.replace(/[^a-z0-9.-]/g, "-") // Replace non-alphanumeric chars with dash
					.replace(/-+/g, "-") // Replace multiple dashes with single dash
					.replace(/^-|-$/g, ""); // Remove leading/trailing dashes
			};

			// Use original filename, sanitized
			const sanitizedFileName = sanitizeFilename(fileName);
			// For SVG files, always use .svg extension regardless of filename
			let extension = sanitizedFileName.split(".").pop() || "jpg";
			if (isSvg) {
				extension = "svg";
			}

			// Handle empty filename case (e.g., when productName was empty)
			const lastDotIndex = sanitizedFileName.lastIndexOf(".");
			let nameWithoutExt =
				lastDotIndex > 0
					? sanitizedFileName.substring(0, lastDotIndex)
					: sanitizedFileName;

			// If nameWithoutExt is empty or only dots/dashes, use timestamp
			if (!nameWithoutExt || nameWithoutExt.replace(/[.-]/g, "").length === 0) {
				const timestamp = Date.now();
				nameWithoutExt = `image-${timestamp}`;
			}

			// Create directory path with proper structure
			let directoryPath = folder;

			// All uploads go under the "images/" prefix in the bucket.
			if (isStaging) {
				// Staging folder structure: images/staging/{folder}/{sessionId}/
				// This allows easy cleanup by session and by folder type
				const stagingSessionId = sessionId || `session-${Date.now()}`;
				directoryPath = `images/staging/${folder}/${stagingSessionId}`;
			} else if (folder === "country-flags") {
				directoryPath = "images/country-flags";
			} else if (folder === "brands") {
				directoryPath = "images/brands";
			} else if (
				categorySlug &&
				productName &&
				categorySlug.trim() &&
				productName.trim()
			) {
				const sanitizedCategorySlug = sanitizeFilename(categorySlug);
				const sanitizedProductName = sanitizeFilename(productName);
				directoryPath = `images/${folder}/${sanitizedCategorySlug}/${sanitizedProductName}`;
			} else if (slug?.trim()) {
				directoryPath = `images/${folder}/${slug}`;
			} else {
				const timestamp = Date.now();
				directoryPath = `images/${folder}/temp-${timestamp}`;
			}

			// Check if file exists and find available name
			let finalName = nameWithoutExt;
			let filename = `${directoryPath}/${finalName}.${extension}`;
			let copyNumber = 0;

			// Check if file exists in R2
			while (await bucket.head(filename)) {
				copyNumber++;
				finalName = `${nameWithoutExt}-copy${copyNumber > 1 ? copyNumber : ""}`;
				filename = `${directoryPath}/${finalName}.${extension}`;
			}

			// Convert base64 to Uint8Array (exact length to avoid S3/R2 signature mismatch)
			const base64Data = fileData.split(",")[1] || fileData;
			const binaryString = atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			// Upload (pass Uint8Array so body length matches exactly; bytes.buffer can be larger)
			await bucket.put(filename, bytes, {
				httpMetadata: {
					// Ensure SVG files get the correct content type
					contentType: isSvg ? "image/svg+xml" : fileType,
				},
			});

			// Upload to R2 successful

			// Return the filename (path in R2)
			const result = {
				success: true,
				filename,
				url: `${ASSETS_BASE_URL}/${filename}`,
			};

			return result;
		} catch (error) {
			console.error("🖥️ Server: Error uploading image:", error);
			console.error("🖥️ Server: Error details:", {
				message: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : undefined,
			});
			setResponseStatus(500);
			throw new Error(
				error instanceof Error ? error.message : "Failed to upload image",
			);
		}
	});
