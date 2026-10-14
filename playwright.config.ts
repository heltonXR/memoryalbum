import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.APP_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chrome-mobile", use: { ...devices["Pixel 7"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "safari-mobile", use: { ...devices["iPhone 13"] } },
  ],
});
