import { vi, type Mock } from "vitest";

export type FetchHandler = (
  url: string,
  init?: RequestInit,
) => Promise<Response> | Response | undefined;

export interface FetchRoute {
  match: (url: string, init?: RequestInit) => boolean;
  respond: (
    url: string,
    init?: RequestInit,
  ) => Promise<Partial<MockedResponse>> | Partial<MockedResponse>;
}

export interface MockedResponse {
  status: number;
  body: unknown;
  contentType: string;
}

export interface InstallFetchOptions {
  routes: FetchRoute[];
  fallback?: FetchHandler;
}

export function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function installFetchMock({ routes, fallback }: InstallFetchOptions): {
  fetchMock: Mock;
  calls: { url: string; init?: RequestInit }[];
  restore: () => void;
} {
  const calls: { url: string; init?: RequestInit }[] = [];
  const original = globalThis.fetch;
  const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as { url: string }).url;
    calls.push({ url, init });

    for (const route of routes) {
      if (route.match(url, init)) {
        const partial = await route.respond(url, init);
        const status = partial.status ?? 200;
        const contentType = partial.contentType ?? "application/json";
        const body =
          contentType.includes("json")
            ? JSON.stringify(partial.body ?? {})
            : String(partial.body ?? "");
        return new Response(body, {
          status,
          headers: { "content-type": contentType },
        });
      }
    }

    if (fallback) {
      const fallbackRes = await fallback(url, init);
      if (fallbackRes) return fallbackRes;
    }

    throw new Error(`Unhandled fetch in test: ${url}`);
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
