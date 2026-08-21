import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["features", "app"];
const ACTION_PATH_RE = /(?:^|\/)actions(?:\/|$)|action\.ts$/;
const MUTATION_HINT_RE = /\b(INSERT INTO|UPDATE\s+public\.|DELETE FROM|db\.query\s*\(|client\.query\s*\()/i;

// Keep this list limited to helpers that actually resolve an authenticated
// application user. The audit is intentionally conservative: adding a helper
// here should mean that callers cannot proceed anonymously.
const AUTH_GUARDS = [
  "getCurrentSessionUserId",
  "requireActiveUser",
  "requireStaffUser",
  "requireCurrentUser",
];

const STAFF_GUARDS = [
  "requireStaffUser",
  "STAFF_ROLES",
  "role === \"admin\"",
  "role !== \"admin\"",
  "profile.role === \"admin\"",
  "profile.role !== \"admin\"",
];

// These helpers/queries establish that the authenticated actor is allowed to
// operate on the referenced project (or constrain the mutation to an owner /
// selected contractor). Merely mentioning project_id is not enough.
const PROJECT_SCOPE_HINTS = [
  "requireActiveProject(",
  "getAccess(",
  "getProjectAccess",
  "getProjectChatAccess",
  "requireProjectParticipant",
  "assertProject",
  "selected_contractor_id",
  "customer_id",
  "owner_id",
  "contractor_id",
];

// Public authentication endpoints deliberately run without a logged-in
// session. They are protected by one-time email tokens, password verification
// and/or rate limiting instead. Keep this allowlist narrow and path-specific.
const PUBLIC_AUTH_ALLOWLIST = [
  /features\/auth\/actions\/(login|register|forgot-password|reset-password|verify-email)/,
  /features\/auth\/actions\/account-email\.ts$/,
];

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function hasAny(source, needles) {
  return needles.some((needle) => source.includes(needle));
}

const files = [];
for (const root of ROOTS) await walk(root, files);

const findings = [];
let audited = 0;

for (const file of files.sort()) {
  const normalized = file.split(path.sep).join("/");
  if (!ACTION_PATH_RE.test(normalized)) continue;

  const source = await readFile(file, "utf8");
  if (!MUTATION_HINT_RE.test(source)) continue;
  if (PUBLIC_AUTH_ALLOWLIST.some((re) => re.test(normalized))) continue;

  audited += 1;

  if (!hasAny(source, AUTH_GUARDS)) {
    findings.push(
      `${normalized}: mutation without an explicit session/role authorization guard`
    );
    continue;
  }

  if (normalized.includes("features/admin/") && !hasAny(source, STAFF_GUARDS)) {
    findings.push(`${normalized}: admin mutation without an explicit staff guard`);
  }

  if (
    /projectId|project_id/.test(source) &&
    !normalized.includes("features/admin/") &&
    !normalized.includes("features/auth/") &&
    !hasAny(source, PROJECT_SCOPE_HINTS)
  ) {
    findings.push(
      `${normalized}: project mutation lacks a recognizable project ownership/participant scope check`
    );
  }
}

if (findings.length) {
  console.error("Authorization audit failed:\n");
  for (const finding of findings) console.error(`- ${finding}`);
  console.error(
    "\nAdd an explicit authorization guard or document a narrowly-scoped exception in the audit script."
  );
  process.exit(1);
}

console.log(`Authorization audit passed: ${audited} mutating action files checked`);
