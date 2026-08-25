import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const standaloneNext = path.join(standalone, ".next");

await mkdir(standaloneNext, { recursive: true });
await rm(path.join(standaloneNext, "static"), { recursive: true, force: true });
await cp(path.join(root, ".next", "static"), path.join(standaloneNext, "static"), { recursive: true });

await rm(path.join(standalone, "public"), { recursive: true, force: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });

console.log("Standalone E2E assets prepared: .next/static + public");
