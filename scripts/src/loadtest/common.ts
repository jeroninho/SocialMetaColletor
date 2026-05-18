import autocannon, { type Options, type Result } from "autocannon";

export const BASE_URL = process.env.LOADTEST_BASE_URL ?? "http://localhost:80";
export const OUT_DIR = new URL("../../loadtest-results/", import.meta.url).pathname;

export type TargetEndpoint = {
  label: string;
  path: string;
  notes: string;
};

export const TARGETS: TargetEndpoint[] = [
  { label: "healthz", path: "/api/healthz", notes: "baseline (no DB, no cache)" },
  { label: "auth-status", path: "/api/auth/status", notes: "uncached, hits DB on every request" },
  { label: "dashboard-summary", path: "/api/dashboard/summary", notes: "cached 60s, DB aggregate" },
  { label: "dashboard-trends", path: "/api/dashboard/engagement-trends", notes: "cached 300s, DB heavy" },
  { label: "dashboard-recent", path: "/api/dashboard/recent-metadata", notes: "cached 120s, DB" },
];

export type CacheStats = {
  tier: string;
  memoryEntries: number;
  memoryMax: number;
  redisAvailable: boolean;
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  errors: number;
  hitRate: number;
};

export async function fetchCacheStats(): Promise<CacheStats | null> {
  try {
    const r = await fetch(`${BASE_URL}/api/health/cache`);
    if (!r.ok) return null;
    return (await r.json()) as CacheStats;
  } catch {
    return null;
  }
}

export async function waitForServer(timeoutMs = 15000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE_URL}/api/healthz`);
      if (r.ok) return true;
    } catch {
      // retry
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  return false;
}

export async function runPhase(opts: Options & { url: string }): Promise<Result> {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    // Stream nothing — keep stdout clean for our own reporting.
    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false, renderLatencyTable: false });
  });
}

export function fmtResult(r: Result) {
  return {
    duration_s: r.duration,
    connections: r.connections,
    requests_total: r.requests.total,
    req_per_sec_avg: round(r.requests.average),
    throughput_kbps: round((r.throughput.average ?? 0) / 1024),
    latency_avg_ms: round(r.latency.average),
    latency_p50_ms: round(r.latency.p50),
    latency_p90_ms: round(r.latency.p90),
    latency_p99_ms: round(r.latency.p99),
    latency_max_ms: round(r.latency.max),
    errors: r.errors,
    timeouts: r.timeouts,
    non_2xx: r.non2xx,
  };
}

export function round(n: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function printHeader(title: string) {
  const line = "═".repeat(title.length + 4);
  console.log(`\n${line}\n  ${title}\n${line}`);
}

export function printResult(label: string, r: Result) {
  const f = fmtResult(r);
  console.log(
    `\n[${label}]\n` +
      `  duration:   ${f.duration_s}s   connections: ${f.connections}\n` +
      `  requests:   ${f.requests_total} total   ${f.req_per_sec_avg} req/s\n` +
      `  throughput: ${f.throughput_kbps} KB/s\n` +
      `  latency:    avg=${f.latency_avg_ms}ms  p50=${f.latency_p50_ms}ms  p90=${f.latency_p90_ms}ms  p99=${f.latency_p99_ms}ms  max=${f.latency_max_ms}ms\n` +
      `  errors:     ${f.errors}   timeouts: ${f.timeouts}   non-2xx: ${f.non_2xx}`,
  );
}

export function diffStats(before: CacheStats | null, after: CacheStats | null) {
  if (!before || !after) return null;
  return {
    hits: after.hits - before.hits,
    misses: after.misses - before.misses,
    sets: after.sets - before.sets,
    invalidations: after.invalidations - before.invalidations,
    errors: after.errors - before.errors,
    hitRate: round(
      (after.hits - before.hits) / Math.max(1, (after.hits - before.hits) + (after.misses - before.misses)),
      3,
    ),
    entries_after: after.memoryEntries,
    tier: after.tier,
  };
}
