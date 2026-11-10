import { defineConfig } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "version-offline-shell",
      closeBundle() {
        const bank = JSON.parse(readFileSync("src/sample-bank.json", "utf8"));
        const samples = [
          ...Object.values(bank.drums).map((d) => d.file),
          ...Object.values(bank.instruments).flatMap((i) =>
            i.zones.map((z) => z.file),
          ),
        ];
        const sw = readFileSync("dist/sw.js", "utf8").replace(
          "...__SAMPLES__",
          samples.map((f) => JSON.stringify(`./${f}`)).join(", "),
        );
        const hash = createHash("sha256")
          .update(readFileSync("dist/index.html"))
          .update(readFileSync("dist/recorder.js"))
          .update(JSON.stringify(bank))
          .update(sw)
          .digest("hex")
          .slice(0, 12);
        writeFileSync("dist/sw.js", sw.replace("__BUILD_ID__", hash));
      },
    },
  ],
});
