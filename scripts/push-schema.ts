/**
 * 自动推送 Drizzle Schema
 * 使用 --force 标志跳过交互式确认
 */

import { spawn } from "child_process";

function runPush(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["drizzle-kit", "push", "--force"], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`drizzle-kit push exited with code ${code}`));
      }
    });
  });
}

runPush().catch(console.error);
