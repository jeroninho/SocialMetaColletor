export function getApiUrl(): string {
  // The API server is mounted at the absolute `/api` path by the workspace
  // proxy, independent of this artifact's BASE_URL prefix.
  return "/api/";
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
