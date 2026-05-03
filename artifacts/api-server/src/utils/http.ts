interface HttpGetOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeoutMs?: number;
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

export async function httpGet<T = unknown>(
  url: string,
  opts: HttpGetOptions = {},
): Promise<HttpResponse<T>> {
  const { params, headers, timeoutMs = 8000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(buildUrl(url, params), {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("application/json")
      ? ((await res.json()) as T)
      : ((await res.text()) as unknown as T);
    if (!res.ok) {
      throw new HttpError(res.status, data, `HTTP ${res.status} for ${url}`);
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}
