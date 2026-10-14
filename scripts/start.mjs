import path from "node:path";
import { spawn } from "node:child_process";
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    LOCAL_STORAGE_PATH: path.resolve(
      process.env.LOCAL_STORAGE_PATH || "data/media",
    ),
    HOSTNAME: process.env.ALBUM_BIND_HOST || "0.0.0.0",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
