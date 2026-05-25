import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BACKEND_PROXY_TARGET = process.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
    plugins: [
        TanStackRouterVite({
            routesDirectory: "./src/routes",
            generatedRouteTree: "./src/routeTree.gen.ts",
            quoteStyle: "double",
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: BACKEND_PROXY_TARGET,
                changeOrigin: true,
            },
        },
    },
});
