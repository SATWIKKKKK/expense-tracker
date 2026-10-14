import type { NextConfig } from "next";

// GitHub Pages serves a project site from /<repo-name>/, so every asset URL
// needs that prefix. The deploy workflow passes it in; local dev leaves it empty.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static export: `next build` writes plain HTML/CSS/JS to out/, which is
  // all GitHub Pages can host (there is no server, and the app needs none).
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
