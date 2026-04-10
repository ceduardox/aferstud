const { spawnSync } = require("child_process");

const skip =
  process.env.SKIP_DB_PUSH === "1" ||
  process.env.SKIP_DB_PUSH === "true" ||
  process.env.SKIP_DB_PUSH === "yes";

if (!process.env.DATABASE_URL) {
  console.warn("[db-push] DATABASE_URL not set. Skipping schema push.");
  process.exit(0);
}

if (skip) {
  console.warn("[db-push] SKIP_DB_PUSH is set. Skipping schema push.");
  process.exit(0);
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCmd, ["run", "db:push"], { stdio: "inherit" });

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error("[db-push] Failed to run db:push:", result.error);
}

process.exit(1);
