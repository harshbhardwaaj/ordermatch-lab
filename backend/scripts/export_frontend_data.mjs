// Exports the grounded synthetic sample data from frontend/data/*.ts to JSON
// fixtures under backend/seed_data/, so the Django seed command (T102) can
// load real seed data without needing Node at deploy time.
//
// Run with: node --experimental-strip-types scripts/export_frontend_data.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontendDataDir = path.join(backendDir, "..", "frontend", "data");
const outDir = path.join(backendDir, "seed_data");

mkdirSync(outDir, { recursive: true });

// Only exports data that maps to backend workflow models. Candidate proof
// items (frontend/data/candidate.ts) back the static /proof narrative page,
// not the order workflow, so they have no backend model and aren't seeded.
const [catalog, orders, evals] = await Promise.all([
  import(path.join(frontendDataDir, "catalog.ts")),
  import(path.join(frontendDataDir, "orders.ts")),
  import(path.join(frontendDataDir, "evals.ts")),
]);

const write = (name, data) => {
  const filePath = path.join(outDir, name);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${filePath}`);
};

write("catalog_items.json", catalog.catalogItems);
write("sample_orders.json", orders.sampleOrders);
write("eval_runs.json", evals.sampleEvalRuns);
