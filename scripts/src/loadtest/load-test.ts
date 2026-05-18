/**
 * LOAD TEST — sustained, baseline traffic.
 *
 * Goal: confirm steady-state behaviour under expected production load.
 * 50 concurrent connections, 30s per endpoint. Look for stable p95/p99
 * and high cache hit rate (because TTLs are 60-300s).
 */
import {
  BASE_URL, OUT_DIR, TARGETS, diffStats, fetchCacheStats, printHeader,
  printResult, runPhase, waitForServer, fmtResult,
} from "./common.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CONNECTIONS = 50;
const DURATION_S = 15;

async function main() {
  printHeader(`LOAD TEST · ${CONNECTIONS} connections · ${DURATION_S}s/endpoint`);
  if (!(await waitForServer())) {
    console.error(`API server not reachable at ${BASE_URL}/api/healthz`);
    process.exit(1);
  }

  const results: Record<string, ReturnType<typeof fmtResult> & { cache: ReturnType<typeof diffStats> }> = {};
  for (const t of TARGETS) {
    const before = await fetchCacheStats();
    const r = await runPhase({
      url: `${BASE_URL}${t.path}`,
      connections: CONNECTIONS,
      duration: DURATION_S,
      pipelining: 1,
      headers: { accept: "application/json" },
    });
    const after = await fetchCacheStats();
    const cache = diffStats(before, after);
    printResult(`${t.label} (${t.notes})`, r);
    if (cache) console.log(`  cache:      hits=${cache.hits} misses=${cache.misses} sets=${cache.sets} hitRate=${cache.hitRate} tier=${cache.tier}`);
    results[t.label] = { ...fmtResult(r), cache };
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "load-test.json"), JSON.stringify({ at: new Date().toISOString(), connections: CONNECTIONS, duration_s: DURATION_S, results }, null, 2));
  console.log(`\nSaved → ${OUT_DIR}/load-test.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
