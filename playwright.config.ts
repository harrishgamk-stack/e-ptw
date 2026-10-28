import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    timezoneId: "Asia/Kuala_Lumpur",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_PATH ??
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    },
  },
  reporter: "list",
});
