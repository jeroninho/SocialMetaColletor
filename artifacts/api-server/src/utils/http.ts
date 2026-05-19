interface HttpGetOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  redirect?: "follow" | "error" | "manual";
}

interface HttpResponse<T> {
  status: number;
  data: T;
}

export class HttpError extends Error {
  constructor(public status: number, public data: unknown, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export class ResponseTooLargeError extends Error {
  constructor(public readonly limit: number, public readonly url: string) {
    super(`Response from ${url} exceeded maximum size of ${limit} bytes`);
    this.name = "ResponseTooLargeError";
  }
}

export const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
export const LINK_PREVIEW_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function buildUrl(url: string, params?: HttpGetOptions["params"]): string {
  if (!params) return url;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const qs = usp.toString();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

async function readBodyWithLimit(
  res: Response,
  limit: number,
  url: string,
  controller: AbortController,
): Promise<string> {
  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const declared = parseInt(contentLength, 10);
    if (!isNaN(declared) && declared > limit) {
      controller.abort();
      throw new ResponseTooLargeError(limit, url);
    }
  }

  if (!res.body) {
    const text = await res.text();
    if (Buffer.byteLength(text) > limit) {
      throw new ResponseTooLargeError(limit, url);
    }
    return text;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > limit) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          controller.abort();
          throw new ResponseTooLargeError(limit, url);
        }
        chunks.push(value);
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)), total);
  return buf.toString("utf8");
}

export async function httpGet<T = unknown>(
  url: string,
  opts: HttpGetOptions = {},
): Promise<HttpResponse<T>> {
  const {
    params,
    headers,
    timeoutMs = 8000,
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
    redirect = "follow",
  } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(buildUrl(url, params), {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect,
    });
    const ct = res.headers.get("content-type") ?? "";
    const text = await readBodyWithLimit(res, maxBytes, url, controller);
    const data = ct.includes("application/json")
      ? (JSON.parse(text) as T)
      : (text as unknown as T);
    if (!res.ok) {
      throw new HttpError(res.status, data, `HTTP ${res.status} for ${url}`);
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}
