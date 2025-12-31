#!/usr/bin/env bun

import solidPlugin from "../../../node_modules/@opentui/solid/scripts/solid-plugin"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

console.log("Building 10x CLI with OpenTUI/Solid...")

const result = await Bun.build({
  conditions: ["browser"],
  tsconfig: "./tsconfig.json",
  plugins: [solidPlugin],
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "bun",
  sourcemap: "external",
})

if (!result.success) {
  console.error("Build failed:")
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log("Build complete!")
console.log(`Output: ${result.outputs.map((o) => o.path).join(", ")}`)
