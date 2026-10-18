import { spawnSync } from "node:child_process";

process.env.DEMO_BUILD = "1";
const res = spawnSync("npx", ["next", "build", "--webpack"], { stdio: "inherit", shell: true });
process.exit(res.status ?? 0);
