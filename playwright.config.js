import { defineConfig } from "@playwright/test";
export default defineConfig({
  workers: 1,
  testDir: "tests/browser",
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
