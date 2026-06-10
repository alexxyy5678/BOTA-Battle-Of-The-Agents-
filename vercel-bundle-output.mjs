import { build } from "esbuild";
import fs from "fs";
import path from "path";

const functionDir = path.resolve(".vercel/output/functions/api/[...slug].func");
const outfile = path.join(functionDir, "api/[...slug].js");
const serverOutfile = path.join(functionDir, "dist/index.cjs");
const staleEsmServerOutfile = path.join(functionDir, "dist/index.js");
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

function copyFileFromProjectToFunction(relativePath) {
  const source = path.resolve(relativePath);
  const target = path.join(functionDir, relativePath);

  if (!fs.existsSync(source)) return;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function pruneFunctionStaticCopies() {
  const configPath = path.join(functionDir, ".vc-config.json");
  const explicitRuntimeFiles = fs.existsSync(configPath)
    ? Object.keys(JSON.parse(fs.readFileSync(configPath, "utf8")).filePathMap || {})
    : [];

  [
    "dist/public",
    "client/public",
    "attached_assets",
    "map",
    "cache",
  ].forEach((relativePath) => {
    fs.rmSync(path.join(functionDir, relativePath), { recursive: true, force: true });
  });

  explicitRuntimeFiles.forEach(copyFileFromProjectToFunction);
}

function pointApiHandlerAtCjsBundle() {
  if (!fs.existsSync(outfile)) return;

  const contents = fs.readFileSync(outfile, "utf8");
  fs.writeFileSync(
    outfile,
    contents.replaceAll("../dist/index.js", "../dist/index.cjs"),
  );
}

function writeApiHandlerWrapper() {
  const contents = `let appHandler = null;
let initPromise = null;

async function loadServerlessAppModule() {
  const mod = await import("../dist/index.cjs");
  return mod.default || mod;
}

async function ensureApp() {
  if (!appHandler) {
    if (!initPromise) {
      initPromise = (async () => {
        console.log("[INIT] Initializing Express app...");
        try {
          const { initAppForServerless } = await loadServerlessAppModule();
          const app = await initAppForServerless();
          appHandler = app;
          console.log("[OK] Express app ready");
          return appHandler;
        } catch (err) {
          console.error("[ERROR] Failed to initialize Express app:", err);
          throw err;
        }
      })();
    }
    await initPromise;
  }
  return appHandler;
}

async function runExpressApp(app, req, res) {
  await new Promise((resolve, reject) => {
    let settled = false;
    const done = (error) => {
      if (settled) return;
      settled = true;
      error ? reject(error) : resolve();
    };

    res.once("finish", () => done());
    res.once("close", () => done());

    try {
      app(req, res, (error) => done(error));
    } catch (error) {
      done(error);
    }
  });
}

function isHealthRequest(req) {
  const path = String(req.url || "").split("?")[0]?.replace(/\\/+$/, "") || "";
  return path === "/api/health";
}

export default async function handler(req, res) {
  if (isHealthRequest(req)) {
    return res.status(200).json({
      status: "ok",
      runtime: "vercel",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    console.log(\`[REQ] \${req.method} \${req.url}\`);
    const app = await ensureApp();
    await runExpressApp(app, req, res);
  } catch (err) {
    console.error("[ERROR] Handler error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
`;

  fs.writeFileSync(outfile, contents);
}

if (!fs.existsSync(functionDir)) {
  throw new Error(`Vercel function output was not found: ${functionDir}`);
}

fs.mkdirSync(path.dirname(outfile), { recursive: true });
fs.mkdirSync(path.dirname(serverOutfile), { recursive: true });
if (fs.existsSync(staleEsmServerOutfile)) {
  fs.unlinkSync(staleEsmServerOutfile);
}

await build({
  entryPoints: ["server/index.ts"],
  outfile: serverOutfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  define: {
    "import.meta.url": JSON.stringify("file:///var/task/dist/index.cjs"),
  },
  external: serverBundleExternals,
  plugins: [optionalNativeFallbackPlugin],
  logLevel: "info",
});

await build({
  entryPoints: ["api/[...slug].ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  external: ["./vite"],
  logLevel: "info",
});

pointApiHandlerAtCjsBundle();
writeApiHandlerWrapper();
pruneFunctionStaticCopies();

console.log(`[vercel-bundle-output] bundled API function to ${outfile}`);
console.log(`[vercel-bundle-output] bundled server function to ${serverOutfile}`);
console.log("[vercel-bundle-output] pruned static-only assets from API function bundle");
