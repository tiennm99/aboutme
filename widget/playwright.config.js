import { defineConfig, devices } from '@playwright/test';

// The system Chrome is used because Playwright's own Chromium build can be
// blocked by AppArmor on Ubuntu. Set PW_CHANNEL= (empty) to use the bundled one.
const channel = process.env.PW_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: channel || undefined } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: channel || undefined } },
  ],
});
