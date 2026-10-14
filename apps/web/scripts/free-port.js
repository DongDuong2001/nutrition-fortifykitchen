const { execSync } = require("child_process");

const port = process.env.PORT || "3100";

if (process.platform === "win32") {
  try {
    const stdout = execSync(`netstat -ano`, { encoding: "utf8" });
    const lines = stdout.split("\n");
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[1] && parts[1].endsWith(`:${port}`) && parts[3] === "LISTENING") {
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
    }
    if (pids.size > 0) {
      console.log(`Port ${port} held by PID(s): ${Array.from(pids).join(", ")}. Killing...`);
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`);
        } catch (e) {
          // ignore
        }
      }
      console.log(`Freed port ${port}.`);
    } else {
      console.log(`Port ${port} is free.`);
    }
  } catch (err) {
    console.log(`Port ${port} is free.`);
  }
} else {
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
}
