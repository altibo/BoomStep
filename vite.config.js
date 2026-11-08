import { defineConfig } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "version-offline-shell",
      closeBundle() {
        const sw = readFileSync("dist/sw.js", "utf8");
        const hash = createHash("sha256")
          .update(readFileSync("dist/index.html"))
          .update(readFileSync("dist/recorder.js"))
          .update(sw)
          .digest("hex")
          .slice(0, 12);
        writeFileSync("dist/sw.js", sw.replace("__BUILD_ID__", hash));
      },
    },
  ],
});
