import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { apiEnv, missingStorageVariables } from "../env";
import { unavailable } from "../errors";

export const uploadUrlTtlSeconds = 300;
export const readUrlTtlSeconds = 3600;

let client: S3Client | undefined;

export const assertStorageConfigured = () => {
  const missing = missingStorageVariables();
  if (missing.length > 0) {
    throw unavailable(
      `El almacenamiento de archivos no está configurado: faltan ${missing.join(", ")}`,
    );
  }
};

const getClient = () => {
  assertStorageConfigured();
  client ??= new S3Client({
    region: "auto",
    endpoint: apiEnv.storage.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: apiEnv.storage.accessKeyId,
      secretAccessKey: apiEnv.storage.secretAccessKey,
    },
  });
  return client;
};

export const createUploadUrl = async (key: string, contentType: string, contentLength: number) =>
  getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: apiEnv.storage.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: uploadUrlTtlSeconds },
  );

export const createReadUrl = async (key: string) =>
  getSignedUrl(getClient(), new GetObjectCommand({ Bucket: apiEnv.storage.bucket, Key: key }), {
    expiresIn: readUrlTtlSeconds,
  });

export const getObjectInfo = async (key: string) => {
  try {
    const head = await getClient().send(
      new HeadObjectCommand({ Bucket: apiEnv.storage.bucket, Key: key }),
    );
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? "" };
  } catch {
    return null;
  }
};

export const getObject = async (key: string) => {
  try {
    const object = await getClient().send(
      new GetObjectCommand({ Bucket: apiEnv.storage.bucket, Key: key }),
    );
    if (!object.Body) return null;
    return {
      body: await object.Body.transformToByteArray(),
      contentType: object.ContentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
};

export const deleteObjects = async (keys: string[]) => {
  if (keys.length === 0) return;
  await getClient().send(
    new DeleteObjectsCommand({
      Bucket: apiEnv.storage.bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );
};
