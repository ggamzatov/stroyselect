import { readFile, writeFile } from "node:fs/promises";

const sourcePath = ".env.local";
const targetPath = ".env.production.local";

const source = await readFile(sourcePath, "utf8");
const lines = source.split(/\r?\n/);

function rewriteUrlHost(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      url.hostname = "host.docker.internal";
    }
    return url.toString();
  } catch {
    return value
      .replace("@127.0.0.1:", "@host.docker.internal:")
      .replace("@localhost:", "@host.docker.internal:")
      .replace("//127.0.0.1:", "//host.docker.internal:")
      .replace("//localhost:", "//host.docker.internal:");
  }
}

const output = lines.map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) return line;
  const [, key, rawValue] = match;

  if (key === "DATABASE_URL" || key === "S3_ENDPOINT") {
    return `${key}=${rewriteUrlHost(rawValue)}`;
  }

  if (key === "APP_BASE_URL" || key === "NEXT_PUBLIC_APP_URL") {
    return `${key}=http://127.0.0.1:3000`;
  }

  return line;
});

await writeFile(targetPath, `${output.join("\n").trimEnd()}\n`, { mode: 0o600 });
console.log(`Prepared ${targetPath} from ${sourcePath}`);
console.log("Rewrote localhost service hosts to host.docker.internal for Docker Desktop.");
