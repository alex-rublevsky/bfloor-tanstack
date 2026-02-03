/**
 * Storage – Yandex Object Storage (S3-compatible).
 *
 * Config from process.env only. Production: Lockbox keys are injected as env vars at deploy time.
 * Local dev: set BFLOOR_STORAGE_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT in .env.
 */

import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

const YANDEX_REGION = "ru-central1";
const BUCKET_KEY = "BFLOOR_STORAGE_BUCKET";
const ENDPOINT_KEY = "AWS_S3_ENDPOINT";
const ACCESS_KEY = "AWS_ACCESS_KEY_ID";
const SECRET_KEY = "AWS_SECRET_ACCESS_KEY";

let s3Client: S3Client | null = null;

function trim(s: string | null | undefined): string {
	return (s ?? "").trim().replace(/\r?\n$/, "");
}

function getBucketName(): string | null {
	return trim(process.env[BUCKET_KEY]) || null;
}

function getEndpoint(): string {
	const raw = trim(process.env[ENDPOINT_KEY]);
	const endpoint = raw.replace(/\/+$/, "") || "";
	const bucket = getBucketName();
	if (bucket && endpoint && endpoint.endsWith(`/${bucket}`)) {
		return endpoint.slice(0, -bucket.length - 1);
	}
	return endpoint;
}

function getCredentials():
	| { accessKeyId: string; secretAccessKey: string }
	| undefined {
	const id = trim(process.env[ACCESS_KEY]);
	const secret = trim(process.env[SECRET_KEY]);
	return id && secret
		? { accessKeyId: id, secretAccessKey: secret }
		: undefined;
}

function getS3Client(): S3Client {
	if (s3Client) return s3Client;
	const credentials = getCredentials();
	if (!credentials) {
		throw new Error(
			"Storage credentials missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (in .env locally or in Lockbox for production).",
		);
	}
	const bucket = getBucketName();
	if (!bucket) {
		throw new Error(
			"Storage bucket missing. Set BFLOOR_STORAGE_BUCKET (in .env locally or in Lockbox for production).",
		);
	}
	const endpoint = getEndpoint();
	s3Client = new S3Client({
		region: YANDEX_REGION,
		forcePathStyle: true,
		credentials,
		...(endpoint && { endpoint }),
	});
	return s3Client;
}

export function resetStorageClient(): void {
	s3Client = null;
}

async function readStreamToUint8Array(
	stream: ReadableStream,
): Promise<Uint8Array> {
	const chunks: Uint8Array[] = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	const total = chunks.reduce((acc, c) => acc + c.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.length;
	}
	return out;
}

type S3Err = { name?: string; $metadata?: { httpStatusCode?: number } };
function isClientError(err: unknown): err is S3Err {
	const e = err as S3Err;
	return (
		e?.name === "NotFound" ||
		((e?.$metadata?.httpStatusCode ?? 0) >= 400 &&
			(e?.$metadata?.httpStatusCode ?? 0) < 500)
	);
}

export interface StorageBucket {
	put(
		key: string,
		value: ArrayBuffer | Uint8Array | ReadableStream | string,
		options?: {
			httpMetadata?: { contentType?: string; cacheControl?: string };
			customMetadata?: Record<string, string>;
		},
	): Promise<void>;
	head(key: string): Promise<{ size?: number; uploaded?: Date } | null>;
	delete(key: string): Promise<void>;
	list(options?: { prefix?: string; limit?: number }): Promise<{
		objects: Array<{ key: string; uploaded?: Date; size?: number }>;
		truncated: boolean;
	}>;
	get(key: string): Promise<{
		body: ReadableStream;
		size: number;
		httpMetadata?: { contentType?: string; cacheControl?: string };
		customMetadata?: Record<string, string>;
		arrayBuffer?: () => Promise<ArrayBuffer>;
	} | null>;
}

class S3StorageBucket implements StorageBucket {
	async put(
		key: string,
		value: ArrayBuffer | Uint8Array | ReadableStream | string,
		options?: {
			httpMetadata?: { contentType?: string; cacheControl?: string };
			customMetadata?: Record<string, string>;
		},
	): Promise<void> {
		const bucket = getBucketName();
		if (!bucket)
			throw new Error(
				"Storage bucket not configured. See Lockbox secret or .env.",
			);
		let body: Uint8Array;
		if (value instanceof Uint8Array) body = value;
		else if (value instanceof ArrayBuffer) body = new Uint8Array(value);
		else if (value instanceof ReadableStream)
			body = await readStreamToUint8Array(value);
		else if (typeof value === "string") body = new TextEncoder().encode(value);
		else throw new Error("Unsupported value type");
		await getS3Client().send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: body,
				ContentType: options?.httpMetadata?.contentType,
				CacheControl: options?.httpMetadata?.cacheControl,
				Metadata: options?.customMetadata,
			}),
		);
	}

	async head(key: string): Promise<{ size?: number; uploaded?: Date } | null> {
		const bucket = getBucketName();
		if (!bucket) return null;
		try {
			const res = await getS3Client().send(
				new HeadObjectCommand({ Bucket: bucket, Key: key }),
			);
			return { size: res.ContentLength, uploaded: res.LastModified };
		} catch (error) {
			if (isClientError(error)) return null;
			throw error;
		}
	}

	async delete(key: string): Promise<void> {
		const bucket = getBucketName();
		if (!bucket) throw new Error("Storage bucket not configured.");
		await getS3Client().send(
			new DeleteObjectCommand({ Bucket: bucket, Key: key }),
		);
	}

	async list(options?: { prefix?: string; limit?: number }): Promise<{
		objects: Array<{ key: string; uploaded?: Date; size?: number }>;
		truncated: boolean;
	}> {
		const bucket = getBucketName();
		if (!bucket) return { objects: [], truncated: false };
		const res = await getS3Client().send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: options?.prefix,
				MaxKeys: options?.limit,
			}),
		);
		return {
			objects: (res.Contents ?? []).map((o) => ({
				key: o.Key ?? "",
				uploaded: o.LastModified,
				size: o.Size,
			})),
			truncated: res.IsTruncated ?? false,
		};
	}

	async get(key: string): Promise<{
		body: ReadableStream;
		size: number;
		httpMetadata?: { contentType?: string; cacheControl?: string };
		customMetadata?: Record<string, string>;
		arrayBuffer?: () => Promise<ArrayBuffer>;
	} | null> {
		const bucket = getBucketName();
		if (!bucket) return null;
		try {
			const res = await getS3Client().send(
				new GetObjectCommand({ Bucket: bucket, Key: key }),
			);
			if (!res.Body) return null;
			const s3Body = res.Body as
				| { transformToByteArray?: () => Promise<Uint8Array> }
				| ReadableStream;
			const arrayBuffer = async (): Promise<ArrayBuffer> => {
				let bytes: Uint8Array;
				if (
					typeof (
						s3Body as { transformToByteArray?: () => Promise<Uint8Array> }
					).transformToByteArray === "function"
				) {
					bytes = await (
						s3Body as { transformToByteArray: () => Promise<Uint8Array> }
					).transformToByteArray();
				} else if (typeof (s3Body as ReadableStream).getReader === "function") {
					bytes = await readStreamToUint8Array(s3Body as ReadableStream);
				} else {
					throw new Error("Unsupported S3 body type");
				}
				return bytes.buffer.slice(0) as ArrayBuffer;
			};
			return {
				body: new ReadableStream({
					start(c) {
						c.close();
					},
				}),
				size: res.ContentLength ?? 0,
				httpMetadata: {
					contentType: res.ContentType,
					cacheControl: res.CacheControl,
				},
				customMetadata: res.Metadata,
				arrayBuffer,
			};
		} catch (error) {
			if (
				(error as S3Err)?.name === "NoSuchKey" ||
				(error as S3Err)?.$metadata?.httpStatusCode === 404
			)
				return null;
			throw error;
		}
	}
}

export function getStorageBucket(): StorageBucket {
	return new S3StorageBucket();
}
