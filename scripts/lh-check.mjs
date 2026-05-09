// Lighthouse for the 3 new routes in light + dark mode.
// Uses lighthouse via npx (avoids adding it as a project dep) — set LH_USE_LOCAL
// to a path to skip dlx.
//
// Usage: node scripts/lh-check.mjs

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const ROUTES = [
  "/scenarios",
  "/scenarios/new",
  "/scenarios/scn_custom_01",
];
const PORT = process.env.PORT ?? "3000";
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = resolve("docs/lighthouse/phase15");
mkdirSync(OUT_DIR, { recursive: true });

const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.9,
};

const headersDarkFile = resolve(tmpdir(), "lh-headers-dark.json");
writeFileSync(
  headersDarkFile,
  JSON.stringify({ "Sec-CH-Prefers-Color-Scheme": "dark" }),
);

function runLighthouse(url, theme, outFile) {
  return new Promise((resolveP) => {
    const args = [
      "-y",
      "lighthouse@12",
      url,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox",
      "--only-categories=performance,accessibility,best-practices",
      "--output=json",
      `--output-path=${outFile}`,
      "--preset=desktop",
    ];
    if (theme === "dark") {
      args.push(`--extra-headers=${headersDarkFile}`);
    }
    const child = spawn("npx", args, {
      stdio: ["ignore", "ignore", "inherit"],
      shell: true,
    });
    child.on("close", () => resolveP());
  });
}

const results = [];

for (const route of ROUTES) {
  for (const theme of ["light", "dark"]) {
    const safe = route.replace(/\//g, "_").replace(/^_/, "");
    const outFile = resolve(OUT_DIR, `${safe || "root"}-${theme}.json`);
    const url = BASE + route;
    process.stdout.write(`Lighthouse  ${theme.padEnd(5)}  ${url} ... `);
    await runLighthouse(url, theme, outFile);
    try {
      const json = JSON.parse(readFileSync(outFile, "utf8"));
      const cats = json.categories;
      const row = {
        route,
        theme,
        performance: cats.performance.score,
        accessibility: cats.accessibility.score,
        bestPractices: cats["best-practices"].score,
      };
      results.push(row);
      console.log(
        `perf=${(row.performance * 100).toFixed(0)} a11y=${(row.accessibility * 100).toFixed(0)} bp=${(row.bestPractices * 100).toFixed(0)}`,
      );
    } catch (err) {
      console.log(`FAILED to parse Lighthouse output: ${err.message}`);
    }
  }
}

writeFileSync(
  resolve(OUT_DIR, "summary.json"),
  JSON.stringify(results, null, 2),
);

let failures = 0;
console.log("\nThresholds: perf>=90 a11y>=95 bp>=90");
for (const r of results) {
  const fails = [];
  if (r.performance < THRESHOLDS.performance) fails.push("perf");
  if (r.accessibility < THRESHOLDS.accessibility) fails.push("a11y");
  if (r.bestPractices < THRESHOLDS["best-practices"]) fails.push("bp");
  if (fails.length > 0) {
    failures++;
    console.log(
      `FAIL  ${r.theme.padEnd(5)}  ${r.route} — under threshold: ${fails.join(", ")}`,
    );
  }
}
if (failures === 0) console.log("All routes meet or exceed thresholds.");
process.exit(failures > 0 ? 1 : 0);
