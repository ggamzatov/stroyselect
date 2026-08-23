"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CalendarClock,
  FileSignature,
  FileText,
  FolderOpen,
  ListChecks,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

type Props = {
  projectId: string;
  role: "customer" | "contractor";
  executionUnlocked?: boolean;
};

const items = [
  { suffix: "", label: "Обзор", icon: FolderOpen, requiresContract: false },
  { suffix: "/appointments", label: "Встречи", icon: CalendarClock, requiresContract: false },
  { suffix: "/contract", label: "Договор", icon: FileSignature, requiresContract: false },
  { suffix: "/changes", label: "Бюджет и платежи", icon: Banknote, requiresContract: true },
  { suffix: "/documents", label: "Документы", icon: FileText, requiresContract: true },
  { suffix: "/issues", label: "Замечания", icon: ListChecks, requiresContract: true },
  { suffix: "/disputes", label: "Споры", icon: ShieldAlert, requiresContract: true },
] as const;

export function ProjectWorkspaceNav({ projectId, role, executionUnlocked = false }: Props) {
  const pathname = usePathname();
  const base = `/${role}/work/${projectId}`;

  return (
    <nav aria-label="Разделы рабочего пространства" className="border-b border-border bg-background/95 backdrop-blur">
      <div className="app-container overflow-x-auto py-3">
        <div className="flex min-w-max gap-2">
          {items.map((item) => {
            const href = `${base}${item.suffix}`;
            const active = item.suffix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
            const locked = item.requiresContract && !executionUnlocked;
            const Icon = item.icon;

            if (locked) {
              return (
                <span
                  key={item.suffix || "overview"}
                  title="Раздел откроется после подписания договора обеими сторонами"
                  aria-disabled="true"
                  className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 text-sm font-semibold text-muted-foreground opacity-70"
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.suffix || "overview"}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/60",
                ].join(" ")}
              >
                <Icon className={["h-4 w-4", active ? "text-primary-foreground" : "text-primary"].join(" ")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
