import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { cleanupStagingImages } from "~/server_functions/dashboard/store/cleanupStagingImages";
import { deleteProductImage } from "~/server_functions/dashboard/store/deleteProductImage";
import { getImageMetadata } from "~/server_functions/dashboard/store/getImageMetadata";
import { uploadProductImage } from "~/server_functions/dashboard/store/uploadProductImage";
import { Button } from "../shared/Button";
import { GripVertical, Trash, Upload } from "../shared/Icon";
import { Textarea } from "../shared/TextArea";

interface ImageUploadProps {
	currentImages: string; // comma-separated string from the form
	onImagesChange: (images: string, deletedImages?: string[]) => void; // callback to update the form
	folder?: string;
	slug?: string; // product slug for subdirectory organization
	categorySlug?: string; // category slug for proper path structure
	productName?: string; // product name for proper file naming
	productId?: number | string; // product ID for view transition
	label?: string; // custom label for the upload section (defaults to "Изображения товара")
}

interface SortableImageItemProps {
	image: string;
	index: number;
	onRemove: (index: number) => Promise<void>;
	fileSize?: number; // File size in bytes
	productId?: number | string; // product ID for view transition
	previewData?: string; // Base64 data URL for staging images
}

function SortableImageItem({
	image,
	index,
	onRemove,
	fileSize,
	productId,
	previewData,
}: SortableImageItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: image });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// Format file size for display
	const formatFileSize = (bytes?: number): string => {
		if (!bytes) return "";
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	};

	// Apply view transition to first image if productId is provided
	const viewTransitionStyle =
		index === 0 && productId
			? { viewTransitionName: `product-image-${productId}` }
			: undefined;

	// Determine the image source:
	// 1. If we have preview data (base64), use it
	// 2. Otherwise, use the R2 public URL
	const imageSrc = previewData || `${ASSETS_BASE_URL}/${image}`;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group relative overflow-hidden rounded-lg border border-border bg-background"
		>
			<div className="relative w-full">
				<img
					src={imageSrc}
					alt={`Product ${index + 1}`}
					className="h-auto w-full object-contain"
					style={viewTransitionStyle}
					onLoad={() => {}}
					onError={(e) => {
						e.currentTarget.src =
							"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
					}}
				/>
				{/* Drag Handle */}
				<button
					type="button"
					{...attributes}
					{...listeners}
					className="absolute top-1 left-1 cursor-grab rounded bg-primary p-1.5 opacity-100 transition-opacity active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
					title="Перетащите для перемещения"
				>
					<GripVertical className="h-3 w-3 text-background" />
				</button>
				{/* Delete Button */}
				<button
					type="button"
					onClick={() => onRemove(index)}
					className="absolute top-1 right-1 cursor-pointer rounded bg-accent p-1.5 opacity-100 transition-opacity hover:bg-accent/90 md:opacity-0 md:group-hover:opacity-100"
					title="Убрать изображение"
				>
					<Trash size={12} className="text-background" />
				</button>
			</div>
			<div className="border-border border-t bg-background p-2">
				<p className="truncate font-mono text-muted-foreground text-xs">
					{image.split("/").pop()}
				</p>
				{fileSize && (
					<p className="mt-0.5 text-muted-foreground text-xs">
						{formatFileSize(fileSize)}
					</p>
				)}
			</div>
		</div>
	);
}

export function ImageUpload({
	currentImages,
	onImagesChange,
	folder = "products",
	slug,
	categorySlug,
	productName,
	productId,
	label = "Изображения товара",
}: ImageUploadProps) {
	// Target max uploaded size (~700KB)
	const TARGET_MAX_BYTES = 700 * 1024;
	const [isUploading, setIsUploading] = useState(false);
	const [imageList, setImageList] = useState<string[]>([]);
	const [showTextarea, setShowTextarea] = useState(false);
	const [textareaValue, setTextareaValue] = useState<string>(
		currentImages || "",
	); // Local state for textarea
	const [isDragging, setIsDragging] = useState(false);
	const [isPasting, setIsPasting] = useState(false);
	const [imageSizes, setImageSizes] = useState<Map<string, number>>(new Map()); // File sizes fetched from R2 server
	const fetchedImagesRef = useRef<Set<string>>(new Set()); // Track which images we've already fetched metadata for
	const fileInputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const fileInputId = useId(); // Use React's useId for stable SSR-safe IDs
	const isProcessingPasteRef = useRef(false); // Guard to prevent double-processing paste events

	// Track staged images (uploaded but not yet saved to database)
	const stagedImagesRef = useRef<Set<string>>(new Set());
	const sessionIdRef = useRef<string>(
		`session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
	);

	// Store base64 preview data for staging images
	const [previewDataMap, setPreviewDataMap] = useState<Map<string, string>>(
		new Map(),
	);

	// Drag and drop sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor),
	);

	// Helper function to generate proper file name
	const generateProperFileName = useCallback(
		(extension: string = "webp"): string => {
			// If we have productName, use it (works for both products with categorySlug and countries without)
			if (productName?.trim()) {
				// Sanitize the product name for file system
				const sanitizedProductName = productName
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "-")
					.replace(/-+/g, "-")
					.replace(/^-|-$/g, "");

				// If sanitization resulted in empty string, fall back to timestamp
				if (sanitizedProductName) {
					return `${sanitizedProductName}.${extension}`;
				}
			}

			// Fallback to timestamp-based name
			const timestamp = Date.now();
			return `pasted-image-${timestamp}.${extension}`;
		},
		[productName],
	);

	// Parse comma-separated string into array
	// Use a ref to track previous currentImages to avoid unnecessary updates
	const prevCurrentImagesRef = useRef<string>("");
	// Debounce timeout for sync operations (console.log, cleanup)
	const syncDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Only update if currentImages actually changed
		if (prevCurrentImagesRef.current === currentImages) {
			return;
		}

		prevCurrentImagesRef.current = currentImages || "";

		const images = currentImages
			? currentImages
					.split(",")
					.map((img) => img.trim())
					.filter(Boolean)
			: [];

		// Update UI state immediately for responsiveness
		setImageList(images);

		// Only sync textarea value if it differs (to avoid overwriting user's current typing)
		setTextareaValue((prev) => {
			const newValue = currentImages || "";
			return prev !== newValue ? newValue : prev;
		});

		// Debounce the sync operations (console.log and cleanup) to avoid running on every keystroke
		if (syncDebounceTimeoutRef.current) {
			clearTimeout(syncDebounceTimeoutRef.current);
		}

		syncDebounceTimeoutRef.current = setTimeout(() => {
			console.log("Syncing imageList from currentImages:", {
				currentImages,
				images,
			});

			// Clean up sizes and fetched tracking for images that are no longer in the list
			setImageSizes((prev) => {
				const newMap = new Map(prev);
				// Remove sizes for images that are no longer in the list
				for (const [imagePath] of newMap) {
					if (!images.includes(imagePath)) {
						newMap.delete(imagePath);
						fetchedImagesRef.current.delete(imagePath);
					}
				}
				return newMap;
			});

			// Update staged images tracking - only track images that are actually in staging
			// Images that come from currentImages (from database) are not staged
			stagedImagesRef.current = new Set(
				images.filter((img) => img.startsWith("staging/")),
			);
		}, 500);
	}, [currentImages]);

	// Fetch metadata from R2 server for all images in the list
	useEffect(() => {
		const fetchMetadataForImages = async () => {
			// Only fetch for images that we haven't fetched yet
			const imagesNeedingMetadata = imageList.filter(
				(image) => !fetchedImagesRef.current.has(image),
			);

			if (imagesNeedingMetadata.length === 0) {
				return;
			}

			// Mark these images as being fetched to prevent duplicate requests
			imagesNeedingMetadata.forEach((image) => {
				fetchedImagesRef.current.add(image);
			});

			// Fetch metadata for all images in parallel from R2
			const metadataPromises = imagesNeedingMetadata.map(async (image) => {
				try {
					const metadata = await getImageMetadata({
						data: { filename: image },
					});
					if (metadata) {
						return { image, size: metadata.size };
					}
				} catch (error) {
					console.warn(`Failed to fetch metadata from R2 for ${image}:`, error);
					// Remove from fetched set on error so we can retry
					fetchedImagesRef.current.delete(image);
				}
				return null;
			});

			const results = await Promise.all(metadataPromises);

			// Update sizes map with metadata fetched from R2 server
			setImageSizes((prev) => {
				const newMap = new Map(prev);
				results.forEach((result) => {
					if (result) {
						newMap.set(result.image, result.size);
					}
				});
				return newMap;
			});
		};

		fetchMetadataForImages();
	}, [imageList]);

	// --- Client-side image compression & WebP conversion ---
	const compressToWebP = useCallback(async (file: File): Promise<File> => {
		const loadImageElement = (srcFile: File): Promise<HTMLImageElement> =>
			new Promise((resolve, reject) => {
				const url = URL.createObjectURL(srcFile);
				const img = new Image();
				img.onload = () => {
					URL.revokeObjectURL(url);
					resolve(img);
				};
				img.onerror = (e) => {
					URL.revokeObjectURL(url);
					reject(e);
				};
				img.src = url;
			});

		const canvasToBlob = (
			canvas: HTMLCanvasElement,
			type: string,
			quality: number,
		): Promise<Blob> =>
			new Promise((resolve, reject) => {
				canvas.toBlob(
					(blob) => {
						if (!blob) return reject(new Error("Failed to create blob"));
						resolve(blob);
					},
					type,
					quality,
				);
			});

		try {
			// Never process SVG files - they should be uploaded as-is
			const isSvg =
				file.type === "image/svg+xml" ||
				file.name.toLowerCase().endsWith(".svg");
			if (isSvg) {
				return file;
			}

			// If already WebP and reasonably small, skip heavy work
			const alreadyWebp = file.type === "image/webp";
			if (alreadyWebp && file.size <= 1.4 * 1024 * 1024) return file;

			const img = await loadImageElement(file);

			// Resize if too large
			const maxDimension = 3000; // cap very large images
			let { width, height } = img;
			if (width > maxDimension || height > maxDimension) {
				const ratio = Math.min(maxDimension / width, maxDimension / height);
				width = Math.round(width * ratio);
				height = Math.round(height * ratio);
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) return file;
			ctx.drawImage(img, 0, 0, width, height);

			// Iterate quality to fit under target size (~700KB)
			let quality = 0.85;
			let blob = await canvasToBlob(canvas, "image/webp", quality);
			while (blob.size > TARGET_MAX_BYTES && quality > 0.4) {
				quality -= 0.05;
				blob = await canvasToBlob(canvas, "image/webp", quality);
			}

			const ext = ".webp";
			const baseName = (
				file.name.includes(".")
					? file.name.slice(0, file.name.lastIndexOf("."))
					: file.name
			).replace(/\.+$/, "");
			const newName = `${baseName}${ext}`;
			return new File([blob], newName, { type: "image/webp" });
		} catch (_e) {
			// Fallback to original file on any failure
			return file;
		}
	}, []);

	const validateAndUploadFile = useCallback(
		async (file: File) => {
			// Guard: prevent duplicate uploads if already processing
			if (isUploading || isPasting) {
				console.log("Skipping upload - already processing:", {
					isUploading,
					isPasting,
					fileName: file.name,
				});
				return;
			}

			console.log("validateAndUploadFile called with file:", {
				name: file.name,
				type: file.type,
				size: file.size,
			});

			// Validate file type
			const allowedTypes = [
				"image/jpeg",
				"image/jpg",
				"image/png",
				"image/webp",
				"image/svg+xml",
			];
			// Also check file extension for SVG (some browsers may not set MIME type correctly)
			const isSvg =
				file.type === "image/svg+xml" ||
				file.name.toLowerCase().endsWith(".svg");

			// If file type is empty or not recognized, but it's from clipboard, assume it's an image
			if (!file.type && file.size > 0) {
				console.warn(
					"File type is empty, assuming image/png for clipboard paste",
				);
				// We'll proceed with the upload and let the server handle validation
			} else if (!allowedTypes.includes(file.type) && !isSvg) {
				console.error("Invalid file type:", file.type);
				toast.error(
					"Недопустимый тип файла. Разрешены только JPEG, PNG, WebP и SVG.",
				);
				return;
			}

			// Validate file size (SVG files can be larger)
			const defaultMaxSizeMB = isSvg ? 5 : 5; // Both can be 5MB, but SVG validation is more lenient
			const maxSize = defaultMaxSizeMB * 1024 * 1024;
			if (file.size > maxSize) {
				toast.error(`File size must be less than ${defaultMaxSizeMB}MB`);
				return;
			}

			setIsUploading(true);

			try {
				// Skip compression for SVG files (they're already optimized vector graphics)
				// Also skip compression if file type is empty (clipboard paste issue)
				const shouldSkipCompression = isSvg || !file.type;
				const processed = shouldSkipCompression
					? file
					: await compressToWebP(file);

				// Hard guard: if still above target, ask user to try a smaller image
				// Skip size check for SVG files (they're usually small and vector-based)
				if (!shouldSkipCompression && processed.size > TARGET_MAX_BYTES) {
					toast.error(
						"Изображение слишком большое после сжатия. Используйте изображение меньшего размера (~700КБ макс.).",
					);
					setIsUploading(false);
					return;
				}

				// Convert file to base64
				const reader = new FileReader();
				reader.onloadend = async () => {
					try {
						const base64String = reader.result as string;

						if (!base64String) {
							console.error("FileReader result is empty");
							toast.error("Не удалось прочитать файл: пустые данные");
							setIsUploading(false);
							return;
						}

						console.log("Uploading image:", {
							fileName: processed.name,
							fileType: processed.type || "image/png",
							fileSize: processed.size,
							folder,
							slug,
							productName,
						});

						const result = await uploadProductImage({
							data: {
								fileData: base64String,
								fileName: processed.name,
								fileType: processed.type || "image/png", // Fallback to image/png if type is empty
								fileSize: processed.size,
								folder,
								slug,
								categorySlug,
								productName,
								isStaging: true, // Upload to staging folder
								sessionId: sessionIdRef.current,
							},
						});

						console.log("Upload result:", result);

						if (result?.success && result?.filename) {
							toast.success("Изображение успешно загружено!");
							// Add new image to the list
							const newImages = [...imageList, result.filename];
							const newImagesString = newImages.join(", ");

							// Track staged image if it's in staging folder
							if (result.filename.startsWith("staging/")) {
								stagedImagesRef.current.add(result.filename);

								// Store base64 preview data for staging images
								setPreviewDataMap((prev) => {
									const newMap = new Map(prev);
									newMap.set(result.filename, base64String);
									return newMap;
								});
							}

							console.log("Updating image list:", {
								oldList: imageList,
								newList: newImages,
								newString: newImagesString,
								stagedImages: Array.from(stagedImagesRef.current),
							});

							// Update local state immediately for instant preview
							setImageList(newImages);
							// File size will be fetched from R2 server via useEffect

							// Update parent with new images
							onImagesChange(newImagesString);

							// IMPORTANT: Reset uploading state after successful upload
							setIsUploading(false);

							// Reset the form
							if (fileInputRef.current) {
								fileInputRef.current.value = "";
							}
						} else {
							console.error("Upload failed - invalid result:", result);
							toast.error(
								"Загрузка изображения не удалась: файл не был загружен",
							);
							setIsUploading(false);
						}
					} catch (error) {
						console.error("Error uploading image:", error);
						toast.error(
							error instanceof Error
								? error.message
								: "Не удалось загрузить изображение",
						);
						setIsUploading(false);
					}
				};

				reader.onerror = (error) => {
					console.error("FileReader error:", error);
					toast.error("Не удалось прочитать файл");
					setIsUploading(false);
				};

				reader.readAsDataURL(processed);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Не удалось загрузить изображение",
				);
				setIsUploading(false);
			}
		},
		[
			imageList,
			onImagesChange,
			folder,
			slug,
			categorySlug,
			productName,
			compressToWebP,
			isUploading,
			isPasting,
		],
	);

	// Handle clipboard paste (document-level handler)
	const handleClipboardPaste = useCallback(
		async (event: ClipboardEvent) => {
			// Guard: prevent double-processing if container handler already processed it
			if (isProcessingPasteRef.current) {
				return;
			}

			// Check if we're in the image upload context
			const isInImageUploadContext =
				containerRef.current?.contains(document.activeElement) ||
				document.activeElement?.closest("[data-image-upload-container]") ||
				document.activeElement?.closest('[role="dialog"]') || // Modal context
				document.activeElement?.closest(".image-upload-area"); // Direct upload area

			if (!isInImageUploadContext) {
				return;
			}

			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			const items = clipboardData.items;

			// Look for image data in clipboard
			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				if (item.type.startsWith("image/")) {
					event.preventDefault();
					event.stopPropagation(); // Prevent container handler from also firing
					isProcessingPasteRef.current = true;
					setIsPasting(true);

					try {
						const file = item.getAsFile();

						if (file) {
							// Generate a proper filename based on product info
							// Handle SVG files specially (type is "image/svg+xml")
							let extension = "png";
							let mimeType = file.type;

							// If file type is empty or generic, use the clipboard item type
							if (!mimeType || mimeType === "application/octet-stream") {
								mimeType = item.type;
							}

							if (mimeType === "image/svg+xml") {
								extension = "svg";
							} else if (mimeType.startsWith("image/")) {
								const typeParts = mimeType.split("/");
								extension = typeParts[1] || "png";
								// Normalize jpg to jpeg
								if (extension === "jpg") extension = "jpeg";
							}

							const filename = generateProperFileName(extension);

							// Create a new File object with the proper name and type
							const namedFile = new File([file], filename, {
								type: mimeType || "image/png",
							});

							await validateAndUploadFile(namedFile);
						} else {
							toast.error("Не удалось извлечь изображение из буфера обмена");
						}
					} catch (error) {
						console.error("Error pasting image:", error);
						toast.error("Не удалось вставить изображение из буфера обмена");
					} finally {
						setIsPasting(false);
						// Reset guard after a short delay to allow for async operations
						setTimeout(() => {
							isProcessingPasteRef.current = false;
						}, 100);
					}
					break;
				}
			}
		},
		[validateAndUploadFile, generateProperFileName],
	);

	// Add clipboard event listener
	useEffect(() => {
		document.addEventListener("paste", handleClipboardPaste);
		return () => {
			document.removeEventListener("paste", handleClipboardPaste);
		};
	}, [handleClipboardPaste]);

	// Alternative: Add paste event directly to the container
	// This handler should only fire if the document-level handler didn't catch it
	const handleContainerPaste = useCallback(
		async (event: React.ClipboardEvent) => {
			// Guard: prevent double-processing if document handler already processed it
			if (isProcessingPasteRef.current) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			event.preventDefault();
			event.stopPropagation(); // Prevent document handler from also firing
			isProcessingPasteRef.current = true;

			const clipboardData = event.clipboardData;
			if (!clipboardData) {
				isProcessingPasteRef.current = false;
				return;
			}

			const items = clipboardData.items;

			// Look for image data in clipboard
			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				if (item.type.startsWith("image/")) {
					setIsPasting(true);

					try {
						const file = item.getAsFile();

						if (file) {
							// Generate a proper filename based on product info
							// Handle SVG files specially (type is "image/svg+xml")
							let extension = "png";
							let mimeType = file.type;

							// If file type is empty or generic, use the clipboard item type
							if (!mimeType || mimeType === "application/octet-stream") {
								mimeType = item.type;
							}

							if (mimeType === "image/svg+xml") {
								extension = "svg";
							} else if (mimeType.startsWith("image/")) {
								const typeParts = mimeType.split("/");
								extension = typeParts[1] || "png";
								// Normalize jpg to jpeg
								if (extension === "jpg") extension = "jpeg";
							}

							const filename = generateProperFileName(extension);

							// Create a new File object with the proper name and type
							const namedFile = new File([file], filename, {
								type: mimeType || "image/png",
							});

							await validateAndUploadFile(namedFile);
						} else {
							toast.error("Не удалось извлечь изображение из буфера обмена");
						}
					} catch (error) {
						console.error("Error pasting image:", error);
						toast.error("Не удалось вставить изображение из буфера обмена");
					} finally {
						setIsPasting(false);
						// Reset guard after a short delay to allow for async operations
						setTimeout(() => {
							isProcessingPasteRef.current = false;
						}, 100);
					}
					break;
				}
			}
		},
		[validateAndUploadFile, generateProperFileName],
	);

	const handleFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;
			validateAndUploadFile(file);
		},
		[validateAndUploadFile],
	);

	const handleDragOver = (
		e: React.DragEvent<HTMLDivElement | HTMLLabelElement | HTMLFieldSetElement>,
	) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (
		e: React.DragEvent<HTMLDivElement | HTMLLabelElement | HTMLFieldSetElement>,
	) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = useCallback(
		(
			e: React.DragEvent<
				HTMLDivElement | HTMLLabelElement | HTMLFieldSetElement
			>,
		) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const file = e.dataTransfer.files?.[0];
			if (file) {
				validateAndUploadFile(file);
			}
		},
		[validateAndUploadFile],
	);

	const handleRemoveImage = async (index: number) => {
		const imageToRemove = imageList[index];

		if (!imageToRemove) {
			return;
		}

		// Remove from staged images if it was staged
		if (imageToRemove.startsWith("staging/")) {
			stagedImagesRef.current.delete(imageToRemove);
		}

		// Remove from list immediately for instant UI feedback
		const newImages = imageList.filter((_, i) => i !== index);
		const newImagesString = newImages.join(", ");

		// Remove file size from map (cleanup)
		setImageSizes((prev) => {
			const newMap = new Map(prev);
			newMap.delete(imageToRemove);
			fetchedImagesRef.current.delete(imageToRemove);
			return newMap;
		});

		// Update local state immediately for instant preview
		setImageList(newImages);
		// Update parent with new list and track removed image for submit-time cleanup (backup if immediate R2 delete fails)
		onImagesChange(newImagesString, [imageToRemove]);

		// Immediately delete from R2 storage
		// Pass current images to check for duplicate references before deleting
		try {
			console.log("🗑️ Deleting image from R2:", imageToRemove);
			const deleteResult = await deleteProductImage({
				data: {
					filename: imageToRemove,
					currentImages: newImagesString, // Pass remaining images to check for duplicates
				},
			});

			if (deleteResult?.success) {
				console.log("✅ Image deleted successfully:", imageToRemove);
				toast.success("Изображение удалено");
			} else {
				console.warn("⚠️ Image deletion returned non-success:", deleteResult);
				toast.warning(
					"Изображение удалено из списка, но может остаться в хранилище",
				);
			}
		} catch (error) {
			console.error("❌ Failed to delete image from R2:", error);
			// Don't revert the UI change - the image is already removed from the list
			// User can re-add it if needed, or it will be cleaned up by automatic cleanup
			toast.error(
				"Не удалось удалить изображение из хранилища. Оно будет очищено автоматически.",
			);
		}
	};

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newValue = e.target.value;
		// Update local state immediately so typing feels responsive
		setTextareaValue(newValue);
		// Update parent immediately - the sync operations are debounced in useEffect
		onImagesChange(newValue);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = imageList.indexOf(active.id as string);
			const newIndex = imageList.indexOf(over.id as string);

			const newImages = arrayMove(imageList, oldIndex, newIndex);
			setImageList(newImages); // Update local state immediately for instant preview
			onImagesChange(newImages.join(", "));
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	// Cleanup staged images when component unmounts (drawer closes)
	useEffect(() => {
		return () => {
			// Cleanup debounce timeout
			if (syncDebounceTimeoutRef.current) {
				clearTimeout(syncDebounceTimeoutRef.current);
			}

			// Cleanup staged images on unmount
			const stagedImages = Array.from(stagedImagesRef.current);
			if (stagedImages.length > 0) {
				// Call cleanup function - best effort, failures are okay
				// Old staging files will be cleaned up automatically after 24h
				cleanupStagingImages({ data: { imagePaths: stagedImages } }).catch(
					() => {
						// Silently fail - cleanup is best effort
						// Automatic cleanup of old files will handle orphaned images
					},
				);
			}
		};
	}, []);

	// Cleanup on beforeunload (page/tab close) - use sendBeacon for reliability
	useEffect(() => {
		const handleBeforeUnload = () => {
			const stagedImages = Array.from(stagedImagesRef.current);
			if (stagedImages.length > 0) {
				// For beforeunload, we can't reliably use async functions
				// Instead, rely on automatic cleanup of old staging files
				// The staging files will be cleaned up after 24 hours automatically
				// This is acceptable given the low volume of uploads
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, []);

	return (
		<div className="space-y-2" ref={containerRef} data-image-upload-container>
			<div className="flex items-center justify-between">
				<label
					htmlFor={fileInputId}
					className="block font-medium text-sm"
					id={`${fileInputId}-label`}
				>
					{label} {imageList.length > 0 && `(${imageList.length})`}
				</label>
				<Button
					type="button"
					onClick={() => setShowTextarea(!showTextarea)}
					variant="outline"
					size="sm"
				>
					{showTextarea ? "Скрыть" : "Редактировать"} Raw
				</Button>
			</div>

			{showTextarea ? (
				<Textarea
					value={textareaValue}
					onChange={handleTextareaChange}
					placeholder="image1.jpg, image2.jpg, image3.jpg"
					className="h-32 resize-none font-mono text-xs"
					rows={4}
				/>
			) : (
				<section
					className="image-upload-area rounded-lg border border-border bg-muted/30 p-4 transition-colors"
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onPaste={handleContainerPaste}
					aria-labelledby={`${fileInputId}-label`}
					style={{
						borderColor: isDragging ? "hsl(var(--primary))" : undefined,
					}}
				>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext items={imageList} strategy={rectSortingStrategy}>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
								{imageList.map((image, index) => {
									return (
										<SortableImageItem
											key={image}
											image={image}
											index={index}
											onRemove={handleRemoveImage}
											fileSize={imageSizes.get(image)}
											productId={productId}
											previewData={previewDataMap.get(image)}
										/>
									);
								})}

								{/* Upload Button */}
								<button
									type="button"
									onClick={handleUploadClick}
									disabled={isUploading || isPasting}
									className="group flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-border/50 border-dashed bg-background text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isUploading || isPasting ? (
										<>
											<span className="animate-spin text-2xl">⏳</span>
											<span className="text-xs">
												{isPasting ? "Вставка..." : "Загрузка..."}
											</span>
										</>
									) : (
										<>
											<Upload className="h-6 w-6 transition-transform group-hover:scale-110" />
											<span className="px-2 text-center text-xs">
												Выберите файлы
											</span>
										</>
									)}
								</button>
							</div>
						</SortableContext>
					</DndContext>

					<p className="mt-3 text-center text-muted-foreground text-xs">
						Перетащите файлы или вставьте (Ctrl+V)
					</p>
				</section>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.svg"
				id={fileInputId}
				onChange={handleFileChange}
				disabled={isUploading}
				className="hidden"
			/>
		</div>
	);
}
