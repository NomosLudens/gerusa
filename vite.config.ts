import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    watch: {
      ignored: ["**/.bun/**", "**/node_modules/**", "**/.cache/**"],
    },
  },
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "server",
      },
      router: {
        // Divide o componente de cada rota em chunk próprio. Sem isso, o glue
        // code das ~50 rotas ia inteiro no chunk principal (~310 KB gzip antes
        // de qualquer interação) — custo de parse/exec pesado no WebKit,
        // principal fator do cold start lento do PWA no iOS.
        // Nota: o gerador do router é o embutido no tanstackStart(); um
        // TanStackRouterVite avulso aqui seria ignorado.
        //
        // @ts-expect-error — node_modules tem duas versões de
        // @tanstack/router-generator (raiz 1.166.36, aninhada em
        // start-plugin-core 1.167.17); os .d.ts resolvidos vêm da versão
        // antiga, que não lista este campo. Em runtime (router-generator
        // 1.167.17, de fato usado) autoCodeSplitting é o nome estável — usar
        // "experimental.enableCodeSplitting" lança erro pedindo essa troca.
        autoCodeSplitting: false,
      },
    }),
    react(),
  ],
});
