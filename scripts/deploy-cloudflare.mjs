import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const cwd = process.cwd();
const wranglerBin = path.join(
  cwd,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
const openNextBin = path.join(
  cwd,
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "index.js",
);
const wranglerArgs = process.argv.slice(2);

run(process.execPath, [openNextBin, "build"]);

run(process.execPath, [wranglerBin, "deploy", ...wranglerArgs], {
  env: {
    ...process.env,
    OPEN_NEXT_DEPLOY: "true",
  },
});
