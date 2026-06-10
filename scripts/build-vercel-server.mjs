import { build } from "esbuild";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const outfile = path.join(distDir, "index.cjs");
const staleEsmOutfile = path.join(distDir, "index.js");

const serverBundleExternals = [
  "./vite",
  "pg-native",
  "@mapbox/node-pre-gyp",
  "sharp",
  "canvas",
  "@resvg/resvg-js",
  "@resvg/resvg-js-win32-x64-msvc",
  "@resvg/resvg-js-linux-x64-gnu",
  "@resvg/resvg-js-linux-x64-musl",
];

const optionalNativeFallbackPlugin = {
  name: "optional-native-fallbacks",
  setup(build) {
    build.onResolve({ filter: /^bufferutil$/ }, () => ({
      path: path.resolve("node_modules/bufferutil/fallback.js"),
    }));
    build.onResolve({ filter: /^utf-8-validate$/ }, () => ({
      path: path.resolve("node_modules/utf-8-validate/fallback.js"),
    }));
  },
};

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(staleEsmOutfile, { force: true });

await build({
  entryPoints: ["server/index.ts"],
  outfile,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  define: {
    "import.meta.url": JSON.stringify("file:///var/task/dist/index.cjs"),
  },
  external: serverBundleExternals,
  plugins: [optionalNativeFallbackPlugin],
  logLevel: "info",
});

console.log(`[build-vercel-server] bundled server to ${outfile}`);
