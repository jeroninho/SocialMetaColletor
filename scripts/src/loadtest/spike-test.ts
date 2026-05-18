/**
 * SPIKE TEST — sudden burst on top of light baseline.
 *
 * Goal: verify the system absorbs a viral-traffic moment without errors.
 * Phases: warm-up (10c × 5s) → SPIKE (400c × 15s) → recover (10c × 5s).
 * Runs against the heaviest cached endpoint (dashboard/engagement-trends)
 * and the uncached /auth/status to expose DB pressure.
 */
import {
  BASE_URL, OUT_DIR, diffStats, fetchCacheStats, fmtResult, printHeader,
  printResult, runPhase, waitForServer,
} from "./common.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const TARGETS = [
  { label: "dashboard-trends", path: "/api/dashboard/engagement-trends", notes: "cached (single-flight expected)" },
  { label: "auth-status", path: "/api/auth/status", notes: "uncached, DB on every hit" },
];

type Phase = { name: string; connections: number; duration: number };
const PHASES: Phase[] = [
  { name: "warmup",  connections: 10,  duration: 5  },
  { name: "spike",   connections: 400, duration: 15 },
  { name: "recover", connections: 10,  duration: 5  },
];

async function main() {
  printHeader(`SPIKE TEST · warmup→spike(400c)→recover`);
  if (!(await waitForServer())) {
    console.error(`API server not reachable at ${BASE_URL}/api/healthz`);
    process.exit(1);
  }

  const all: Record<string, Record<string, unknown>> = {};
  for (const t of TARGETS) {
    console.log(`\n--- target: ${t.label} (${t.notes}) ---`);
    all[t.label] = {};
    for (const p of PHASES) {
      const before = await fetchCacheStats();
      const r = await runPhase({
        url: `${BASE_URL}${t.path}`,
        connections: p.connections,
        duration: p.duration,
        pipelining: 1,
        headers: { accept: "application/json" },
      });
      const after = await fetchCacheStats();
      const cache = diffStats(before, after);
      printResult(`${t.label} · ${p.name} (${p.connections}c × ${p.duration}s)`, r);
      if (cache) console.log(`  cache:      hits=${cache.hits} misses=${cache.misses} sets=${cache.sets} hitRate=${cache.hitRate}`);
      all[t.label][p.name] = { ...fmtResult(r), cache };
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "spike-test.json"), JSON.stringify({ at: new Date().toISOString(), phases: PHASES, targets: all }, null, 2));
  console.log(`\nSaved → ${OUT_DIR}/spike-test.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
