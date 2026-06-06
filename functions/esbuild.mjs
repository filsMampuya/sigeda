import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  logLevel: "info",
  external: [
    "firebase-admin",
    "firebase-admin/*",
    "firebase-functions",
    "firebase-functions/*",
    "pdf-parse",
    "tesseract.js"
  ]
});
