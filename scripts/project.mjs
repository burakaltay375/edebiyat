import fs from "node:fs";
import {createRequire} from "node:module";
if(process.platform==="win32")createRequire(import.meta.url)("../backend/scripts/windows-path.cjs");
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = path.join(root, ".runtime");
const command = process.argv[2] || "prepare";
const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(runtime, to), { recursive: true });
fs.mkdirSync(runtime, { recursive: true });
// Only copy tracked source directories, never rebuild the user's D1 state.
for (const dir of ["app", "components", "hooks", "features", "public", "data"]) copy("frontend/" + dir, dir);
for (const dir of ["lib", "db", "data", "drizzle", "tests"]) copy("backend/" + dir, dir);
for (const file of ["cloudflare-env.d.ts", "worker.ts"]) copy("backend/" + file, file);
for (const file of ["vite.config.ts", "next.config.ts", "postcss.config.mjs", "tsconfig.json"]) copy("frontend/" + file, file);
copy("backend/app-api", "app/api");
copy("package.json", "package.json");
copy(fs.existsSync(path.join(root, "wrangler.local.json")) ? "wrangler.local.json" : "wrangler.json", "wrangler.json");
const secretPath = path.join(root, ".dev.vars");
const stagedSecret = path.join(runtime, ".dev.vars");
if (fs.existsSync(secretPath)) fs.copyFileSync(secretPath, stagedSecret);
else if (fs.existsSync(stagedSecret)) fs.unlinkSync(stagedSecret);

function run(file, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, file), ...args], {
    cwd: runtime, stdio: "inherit", env: { ...process.env, CLOUDFLARE_CF_FETCH_ENABLED: "false", WRANGLER_SEND_METRICS: "false" }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (command === "build" || command === "dev") {
  process.chdir(runtime);
  process.env.CLOUDFLARE_CF_FETCH_ENABLED = "false";
  process.env.WRANGLER_SEND_METRICS = "false";
  const cli = path.join(root, "node_modules/vinext/dist/cli.js");
  process.argv = [process.execPath, cli, command, ...(command === "dev" ? ["--host", "127.0.0.1", "--port", "5173"] : [])];
  await import(pathToFileURL(cli).href);
}
else if (command === "typecheck") run("node_modules/typescript/bin/tsc", ["--noEmit"]);
else if (command === "test") {
  run(".runtime/tests/run.mjs");
  run(".runtime/features/practice/practice.test.mjs");
} else if (command === "db:local") run("node_modules/wrangler/bin/wrangler.js", ["d1", "migrations", "apply", "DB", "--local", "--config", "wrangler.json"]);
else if (command !== "prepare") throw new Error("Unknown project command");
