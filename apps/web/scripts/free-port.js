const { execSync } = require("child_process");

const port = process.env.PORT || "3100";

try {
  const stdout = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" }).trim();
  if (stdout) {
    const pids = stdout.split("\n").filter(Boolean);
    console.log(`Port ${port} held by PID(s): ${pids.join(", ")}. Killing...`);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`);
      } catch (e) {
        // ignore
      }
    }
    console.log(`Freed port ${port}.`);
  } else {
    console.log(`Port ${port} is free.`);
  }
} catch (err) {
  // lsof exits with 1 if no process listening
  console.log(`Port ${port} is free.`);
}
