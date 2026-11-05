import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cli = require("@tauri-apps/cli/main");

try {
  await cli.run(process.argv.slice(2), "tauri");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
