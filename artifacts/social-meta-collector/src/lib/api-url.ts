export function getApiUrl(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/`;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("smc_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers ?? {}),
  };
  return fetch(url, { ...options, headers });
}
