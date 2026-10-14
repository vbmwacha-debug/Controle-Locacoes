/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  // o ExcelJS (~940 kB) fica num arquivo separado, carregado só ao usar planilhas
  build: { chunkSizeWarningLimit: 1000 },
  // a primeira carga do ExcelJS dentro do Vitest é lenta
  test: { testTimeout: 60000 },
});
