/**
 * Storage Utility
 *
 * Provides a unified storage interface for Yandex Object Storage
 * Uses AWS S3 SDK for S3-compatible API access
 */

import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { env } from "./env";

let s3Client: S3Client | null = null;

/**
 * Valid region code for Yandex Object Storage
 * According to official Yandex Cloud documentation, always use "ru-central1"
 * @see https://yandex.cloud/en/docs/storage/
 */
const YANDEX_REGION = "ru-central1" as const;

/**

 */
function getS3Client(): S3Client {
	if (!s3Client) {
		// Yandex Object Storage requires specific configuration
		const config: S3ClientConfig = {
			// Always use ru-central1 for Yandex Object Storage
			region: YANDEX_REGION,
			// Yandex Object Storage requires path-style addressing
			// Format: https://storage.yandexcloud.net/bucket-name/object-key
			forcePathStyle: true,
		};

		// Set credentials (required for Yandex Object Storage)
		if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
			config.credentials = {
				accessKeyId: env.AWS_ACCESS_KEY_ID,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
			};
		}

		// Set Yandex Object Storage endpoint
		if (env.AWS_S3_ENDPOINT) {
			// Standard Yandex endpoint: https://storage.yandexcloud.net
			let endpoint = env.AWS_S3_ENDPOINT.trim();

			// Remove trailing slash
			endpoint = endpoint.replace(/\/+$/, "");

			// Ensure endpoint doesn't include bucket name in path
			if (bucketName) {
				const bucketNamePattern = new RegExp(
					`/${bucketName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`,
					"i",
				);
				if (bucketNamePattern.test(endpoint)) {
					endpoint = endpoint.replace(bucketNamePattern, "");
				}
			}

			config.endpoint = endpoint;
		}

		s3Client = new S3Client(config);
	}

	return s3Client;
}

const bucketName = env.BFLOOR_STORAGE_BUCKET;

if (!bucketName) {
	console.warn(
		"Storage bucket name not configured. Storage operations will fail.",
	);
}

/**
 * Storage interface for Yandex Object Storage
 * Compatible with S3-like bucket operations
 */
export interface StorageBucket {
	put(
		key: string,
		value: ArrayBuffer | ReadableStream | string,
		options?: {
			httpMetadata?: {
				contentType?: string;
				cacheControl?: string;
			};
			customMetadata?: Record<string, string>;
		},
	): Promise<void>;

	head(key: string): Promise<{ size?: number; uploaded?: Date } | null>;

	delete(key: string): Promise<void>;

	list(options?: { prefix?: string; limit?: number }): Promise<{
		objects: Array<{
			key: string;
			uploaded?: Date;
			size?: number;
		}>;
		truncated: boolean;
	}>;

	get(key: string): Promise<{
		body: ReadableStream;
		size: number;
		httpMetadata?: {
			contentType?: string;
			cacheControl?: string;
		};
		customMetadata?: Record<string, string>;
		arrayBuffer?: () => Promise<ArrayBuffer>;
	} | null>;
}

class S3StorageBucket implements StorageBucket {
	async put(
		key: string,
		value: ArrayBuffer | ReadableStream | string,
		options?: {
			httpMetadata?: {
				contentType?: string;
				cacheControl?: string;
			};
			customMetadata?: Record<string, string>;
		},
	): Promise<void> {
		if (!bucketName) {
			throw new Error("Storage bucket not configured");
		}

		const client = getS3Client();

		// Convert value to Uint8Array
		let body: Uint8Array;
		if (value instanceof ArrayBuffer) {
			body = new Uint8Array(value);
		} else if (value instanceof ReadableStream) {
			// Convert ReadableStream to Uint8Array
			const chunks: Uint8Array[] = [];
			const reader = value.getReader();
			while (true) {
				const { done, value: chunk } = await reader.read();
				if (done) break;
				chunks.push(chunk);
			}
			const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
			body = new Uint8Array(totalLength);
			let offset = 0;
			for (const chunk of chunks) {
				body.set(chunk, offset);
				offset += chunk.length;
			}
		} else if (typeof value === "string") {
			body = new TextEncoder().encode(value);
		} else {
			throw new Error("Unsupported value type");
		}

		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			Body: body,
			ContentType: options?.httpMetadata?.contentType,
			CacheControl: options?.httpMetadata?.cacheControl,
			Metadata: options?.customMetadata,
		});

		await client.send(command);
	}

	async head(key: string): Promise<{ size?: number; uploaded?: Date } | null> {
		if (!bucketName) {
			return null;
		}

		try {
			const client = getS3Client();
			const command = new HeadObjectCommand({
				Bucket: bucketName,
				Key: key,
			});

			const response = await client.send(command);

			return {
				size: response.ContentLength,
				uploaded: response.LastModified,
			};
		} catch (error) {
			const err = error as {
				name?: string;
				$metadata?: { httpStatusCode?: number };
			};
			const statusCode = err.$metadata?.httpStatusCode;

			// Handle client errors (4xx) gracefully - treat as "file doesn't exist"
			// This includes 404 (Not Found) and 400 (Bad Request - invalid key format, etc.)
			if (
				err.name === "NotFound" ||
				statusCode === 404 ||
				statusCode === 400 ||
				(statusCode && statusCode >= 400 && statusCode < 500)
			) {
				// Log warning for non-404 errors to help debug issues
				if (statusCode !== 404 && statusCode !== undefined) {
					console.warn(
						`Storage head operation returned ${statusCode} for key "${key}":`,
						err.name || "Unknown error",
					);
				}
				return null;
			}

			// Re-throw server errors (5xx) and unexpected errors
			throw error;
		}
	}

	async delete(key: string): Promise<void> {
		if (!bucketName) {
			throw new Error("Storage bucket not configured");
		}

		const client = getS3Client();
		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		await client.send(command);
	}

	async list(options?: { prefix?: string; limit?: number }): Promise<{
		objects: Array<{
			key: string;
			uploaded?: Date;
			size?: number;
		}>;
		truncated: boolean;
	}> {
		if (!bucketName) {
			return { objects: [], truncated: false };
		}

		const client = getS3Client();
		const command = new ListObjectsV2Command({
			Bucket: bucketName,
			Prefix: options?.prefix,
			MaxKeys: options?.limit,
		});

		const response = await client.send(command);

		return {
			objects:
				response.Contents?.map((obj) => ({
					key: obj.Key || "",
					uploaded: obj.LastModified,
					size: obj.Size,
				})) || [],
			truncated: response.IsTruncated || false,
		};
	}

	async get(key: string): Promise<{
		body: ReadableStream;
		size: number;
		httpMetadata?: {
			contentType?: string;
			cacheControl?: string;
		};
		customMetadata?: Record<string, string>;
		arrayBuffer?: () => Promise<ArrayBuffer>;
	} | null> {
		if (!bucketName) {
			return null;
		}

		try {
			const client = getS3Client();
			const command = new GetObjectCommand({
				Bucket: bucketName,
				Key: key,
			});

			const response = await client.send(command);

			if (!response.Body) {
				return null;
			}

			const size = response.ContentLength || 0;

			// Helper to convert AWS SDK body to ArrayBuffer
			const arrayBuffer = async (): Promise<ArrayBuffer> => {
				const body = response.Body;

				// Check if body has transformToByteArray method (AWS SDK v3)
				if (
					body &&
					typeof (
						body as unknown as {
							transformToByteArray?: () => Promise<Uint8Array>;
						}
					).transformToByteArray === "function"
				) {
					const bytes = await (
						body as unknown as {
							transformToByteArray: () => Promise<Uint8Array>;
						}
					).transformToByteArray();
					return bytes.buffer as ArrayBuffer;
				}

				// Check if body is a ReadableStream with getReader
				if (
					body &&
					typeof (
						body as unknown as { getReader?: () => ReadableStreamDefaultReader }
					).getReader === "function"
				) {
					const reader = (body as ReadableStream).getReader();
					const chunks: Uint8Array[] = [];
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						chunks.push(value);
					}
					const totalLength = chunks.reduce(
						(acc, chunk) => acc + chunk.length,
						0,
					);
					const result = new Uint8Array(totalLength);
					let offset = 0;
					for (const chunk of chunks) {
						result.set(chunk, offset);
						offset += chunk.length;
					}
					return result.buffer as ArrayBuffer;
				}

				// Fallback: try to convert to Uint8Array directly
				if (body instanceof Uint8Array) {
					return body.buffer as ArrayBuffer;
				}

				throw new Error("Unsupported body type from S3 GetObject response");
			};

			// Create a dummy ReadableStream for compatibility
			// (actual reading happens through arrayBuffer method)
			const body = new ReadableStream({
				start(controller) {
					controller.close();
				},
			}) as ReadableStream;

			return {
				body,
				size,
				httpMetadata: {
					contentType: response.ContentType,
					cacheControl: response.CacheControl,
				},
				customMetadata: response.Metadata,
				arrayBuffer,
			};
		} catch (error) {
			const err = error as {
				name?: string;
				$metadata?: { httpStatusCode?: number };
			};
			if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
				return null;
			}
			throw error;
		}
	}
}

/**
 * Get the storage bucket instance for Yandex Object Storage
 */
export function getStorageBucket(): StorageBucket {
	return new S3StorageBucket();
}
