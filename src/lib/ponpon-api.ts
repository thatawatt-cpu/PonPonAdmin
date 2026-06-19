import { request } from "node:https";
import { URL } from "node:url";

export const PONPON_API_BASE_URL =
  process.env.PONPON_API_BASE_URL ?? "https://127.0.0.1:7005";

type ApiRequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: string | Buffer;
};

export class PonPonApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`PonPon API request failed with ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function ponponApiJson<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await ponponApiRaw(path, options);
  const text = response.body.toString("utf8");

  if (!response.ok) {
    throw new PonPonApiError(response.status, text);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function ponponApiRaw(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{
  body: Buffer;
  headers: Record<string, string | string[] | undefined>;
  ok: boolean;
  status: number;
}> {
  const url = new URL(path, PONPON_API_BASE_URL);
  const body = options.body;
  const headers = new Headers(options.headers);

  if (body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (body && !headers.has("content-length")) {
    headers.set("content-length", String(Buffer.byteLength(body)));
  }

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: options.method ?? "GET",
        headers: Object.fromEntries(headers.entries()),
        rejectUnauthorized: shouldRejectUnauthorized(url),
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          resolve({
            body: Buffer.concat(chunks),
            headers: res.headers,
            ok: status >= 200 && status < 300,
            status,
          });
        });
      },
    );

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function shouldRejectUnauthorized(url: URL) {
  if (process.env.PONPON_API_ALLOW_SELF_SIGNED === "true") {
    return false;
  }

  if (
    process.env.PONPON_API_ALLOW_SELF_SIGNED !== "false" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  ) {
    return false;
  }

  return true;
}
