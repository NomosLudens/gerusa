import { defineConfig, devices } from "@playwright/test";
import { validateAuthenticatedE2ETarget } from "./src/lib/e2e-target";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }

  return value;
}

const baseURL = validateAuthenticatedE2ETarget(
  requiredEnv("E2E_BASE_URL"),
  process.env.E2E_CLOUDFLARE_ACCOUNT,
);
requiredEnv("E2E_ADMIN_EMAIL");
requiredEnv("E2E_ADMIN_PASSWORD");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 90_000 },
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL,
    // Esta suíte autentica uma pessoa real: não retenha estado, trace, vídeo
    // ou screenshot que possam carregar a sessão ou dados da conversa.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
