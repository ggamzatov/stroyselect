import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button, ButtonLink } from "../../components/ui/button";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourceRoots = ["app", "components", "features"].map((directory) => path.join(projectRoot, directory));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

describe("canonical button semantics", () => {
  it("renders actions as native buttons and navigation as anchors", () => {
    const action = renderToStaticMarkup(<Button>Action</Button>);
    const submit = renderToStaticMarkup(<Button type="submit">Submit</Button>);
    const navigation = renderToStaticMarkup(<ButtonLink href="/destination">Go</ButtonLink>);

    expect(action).toMatch(/^<button\b[^>]*\btype="button"/);
    expect(submit).toMatch(/^<button\b[^>]*\btype="submit"/);
    expect(navigation).toMatch(/^<a\b[^>]*\bhref="\/destination"/);
    expect(action).not.toMatch(/<a\b|<button[^>]*>\s*<a\b/);
    expect(navigation).not.toMatch(/<button\b|<a[^>]*>\s*<button\b/);
  });

  it("does not leave a Base UI button-link compatibility path in application source", () => {
    const unsafeUsages = sourceRoots
      .flatMap(sourceFiles)
      .flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return /<Button\b[^>]*\brender=/g.test(source) ? [path.relative(projectRoot, filePath)] : [];
      });
    const buttonSource = readFileSync(path.join(projectRoot, "components/ui/button.tsx"), "utf8");

    expect(unsafeUsages).toEqual([]);
    expect(buttonSource).toMatch(/Omit<ButtonPrimitive\.Props, "className" \| "nativeButton" \| "render">/);
    expect(buttonSource).toContain("function ButtonLink");
  });
});
