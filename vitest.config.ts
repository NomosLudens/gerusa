import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Config mínima e isolada do build do app (não carrega os plugins do Vite/TanStack):
// os testes cobrem funções puras de domínio, sem SSR nem bundler.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
