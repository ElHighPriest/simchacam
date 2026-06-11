import "server-only";
import { createHash, createHmac } from "node:crypto";

export type R2Config = {
  accessKeyId: string;
  bucketName: string;
  endpoint: URL;
  prefix: string;
  region: string;
  secretAccessKey: string;
};

export function getR2Config(): R2Config {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;
  const prefix = process.env.R2_RECORDINGS_PREFIX || "recordings/";
  const region = process.env.R2_REGION || "auto";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (
    !accessKeyId ||
    !bucketName ||
    !endpoint ||
    !secretAccessKey
  ) {
    throw new Error("Missing R2 server credentials");
  }

  return {
    accessKeyId,
    bucketName,
    endpoint: new URL(endpoint),
    prefix,
    region,
    secretAccessKey,
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function createSignedR2Url(
  objectKey: string,
  options: {
    downloadFilename?: string;
    expiresInSeconds?: number;
  } = {}
) {
  const config = getR2Config();
  const expiresInSeconds = options.expiresInSeconds ?? 300;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const credentialScope =
    `${dateStamp}/${config.region}/${service}/aws4_request`;
  const canonicalUri =
    `/${encodeRfc3986(config.bucketName)}/` +
    objectKey.split("/").map(encodeRfc3986).join("/");
  const queryParameters: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  };

  if (options.downloadFilename) {
    const safeFilename = options.downloadFilename.replace(/["\\\r\n]/g, "_");
    queryParameters["response-content-disposition"] =
      `attachment; filename="${safeFilename}"`;
  }

  const canonicalQuery = Object.entries(queryParameters)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
  const canonicalHeaders = `host:${config.endpoint.host}\n`;
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return `${config.endpoint.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function testR2Connection() {
  const config = getR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const payloadHash = sha256("");
  const canonicalUri = `/${encodeURIComponent(config.bucketName)}`;
  const canonicalQuery =
    `list-type=2&max-keys=1&prefix=${encodeURIComponent(config.prefix)}`;
  const canonicalHeaders =
    `host:${config.endpoint.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope =
    `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const requestUrl =
    `${config.endpoint.origin}${canonicalUri}?${canonicalQuery}`;

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`R2 returned HTTP ${response.status}`);
  }

  return {
    bucket: config.bucketName,
    prefix: config.prefix,
  };
}
