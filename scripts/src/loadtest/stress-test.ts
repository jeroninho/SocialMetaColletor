/**
 * STRESS TEST — ramped load to find the breaking point.
 *
 * Goal: push concurrency until p99 latency or error rate degrade. The
 * "breaking point" is the first stage where any of these is true:
 *   • non-2xx responses > 1% of total
 *   • timeouts > 0
 *   • p99 latency > 2000 ms
 *
 * Runs against the data-heavy uncached endpoint (/api/auth/status) since
 * the user flagged the data layer as the bottleneck. Stages: 25, 50, 100,
 * 200, 400, 800 concurrent connections, 15s each.
 */
import {
  BASE_URL, OUT_DIR, diffStats, fetchCacheStats, fmtResult, printHeader,
  printResult, runPhase, waitForServer,
} from "./common.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const STAGES = [25, 50, 100, 200, 400, 800];
const STAGE_DURATION_S = 8;
const TARGETS = [
  { label: "auth-status", path: "/api/auth/status", notes: "uncached DB on every hit" },
  { label: "dashboard-summary", path: "/api/dashboard/summary", notes: "cached 60s" },
];
const BREAK_P99_MS = 2000;
const BREAK_NON2XX_PCT = 1.0;

async function main() {
  printHeader(`STRESS TEST · stages ${STAGES.join(",")}c · ${STAGE_DURATION_S}s each`);
  if (!(await waitForServer())) {
    console.error(`API server not reachable at ${BASE_URL}/api/healthz`);
    process.exit(1);
  }

  const report: Record<string, { breakingPoint: number | null; stages: unknown[] }> = {};
  for (const t of TARGETS) {
    console.log(`\n--- target: ${t.label} (${t.notes}) ---`);
    const stages: unknown[] = [];
    let breakingPoint: number | null = null;
    for (const c of STAGES) {
      const before = await fetchCacheStats();
      const r = await runPhase({
        url: `${BASE_URL}${t.path}`,
        connections: c,
        duration: STAGE_DURATION_S,
        pipelining: 1,
        headers: { accept: "application/json" },
      });
      const after = await fetchCacheStats();
      const cache = diffStats(before, after);
      const non2xxPct = (r.non2xx / Math.max(1, r.requests.total)) * 100;
      const broke = breakingPoint === null && (r.non2xx > 0 && non2xxPct > BREAK_NON2XX_PCT || r.timeouts > 0 || r.latency.p99 > BREAK_P99_MS);
      printResult(`${t.label} · ${c}c`, r);
      if (cache) console.log(`  cache:      hits=${cache.hits} misses=${cache.misses} hitRate=${cache.hitRate}`);
      console.log(`  non2xx%:    ${non2xxPct.toFixed(2)}%`);
      stages.push({ ...fmtResult(r), stage_connections: c, non2xx_pct: round1(non2xxPct), cache });
      if (broke) {
        breakingPoint = c;
        console.log(`  >>> breaking point reached at ${c} connections`);
        break;
      }
    }
    report[t.label] = { breakingPoint, stages };
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "stress-test.json"), JSON.stringify({ at: new Date().toISOString(), stages_c: STAGES, stage_duration_s: STAGE_DURATION_S, criteria: { non2xx_pct: BREAK_NON2XX_PCT, p99_ms: BREAK_P99_MS }, report }, null, 2));
  console.log(`\nSaved → ${OUT_DIR}/stress-test.json`);
}

function round1(n: number) { return Math.round(n * 10) / 10; }

main().catch((e) => { console.error(e); process.exit(1); });
