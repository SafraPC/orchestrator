import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Em dev: você pode rodar o core em 5174 e a UI em 5173.
// Este proxy evita problemas de CORS para chamadas HTTP (o WS pode conectar direto no core).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5174",
    },
  },
});
