import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // StroySelect renders short-lived S3 signed URLs and local blob previews.
      // Running those through the Next image optimizer adds little value and can
      // conflict with expiring URLs, so these views intentionally use <img>.
      "@next/next/no-img-element": "off",

      // React Hook Form exposes imperative helpers such as watch(). React
      // Compiler safely skips memoization for those components; this is an
      // expected integration characteristic rather than an application error.
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: ["features/bids/actions/update-bid-status.ts"],
    rules: {
      // Keep the action readable while the surrounding bid workflow is being
      // consolidated; TypeScript/build still validate the implementation.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
