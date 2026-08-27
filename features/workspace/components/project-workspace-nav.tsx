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
  ShoppingCart,
} from "lucide-react";

type Props = {
  projectId: string;
  role: "customer" | "contractor";
  executionUnlocked?: boolean;
};

const items = [
  { suffix: "", label: "Обзор", icon: FolderOpen, requiresContract: false },
  { suffix: "/changes", label: "Финансы", icon: Banknote, requiresContract: true },
  { suffix: "/materials", label: "Материалы", icon: ShoppingCart, requiresContract: true },
  { suffix: "/documents", label: "Документы", icon: FileText, requiresContract: true },
  { suffix: "/appointments", label: "Встречи", icon: CalendarClock, requiresContract: false },
  { suffix: "/contract", label: "Договор", icon: FileSignature, requiresContract: false },
  { suffix: "/issues", label: "Замечания", icon: ListChecks, requiresContract: true },
  { suffix: "/disputes", label: "Споры", icon: ShieldAlert, requiresContract: true },
] as const;

export function ProjectWorkspaceNav({
  projectId,
  role,
  executionUnlocked = false,
}: Props) {
  const pathname = usePathname();
  const base = `/${role}/work/${projectId}`;

  return (
    <div className="bg-background px-4 pt-4 lg:px-6 lg:pt-5">
      <nav
        aria-label="Разделы рабочего пространства"
        className="mx-auto max-w-[1320px] overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-[var(--shadow-soft)]"
      >
        <div className="overflow-x-auto px-2 sm:px-3">
          <div className="flex min-w-max items-center gap-1">
            {items.map((item) => {
              const href = `${base}${item.suffix}`;
              const active = item.suffix
                ? pathname === href || pathname.startsWith(`${href}/`)
                : pathname === base;
              const locked = item.requiresContract && !executionUnlocked;
              const Icon = item.icon;

              if (locked) {
                return (
                  <span
                    key={item.suffix || "overview"}
                    title="Раздел откроется после подписания договора обеими сторонами"
                    aria-disabled="true"
                    className="inline-flex min-h-14 cursor-not-allowed items-center gap-2 border-b-2 border-transparent px-3.5 text-sm font-semibold text-muted-foreground opacity-55 sm:px-4"
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
                    "inline-flex min-h-14 items-center gap-2 border-b-2 px-3.5 text-sm font-semibold transition sm:px-4",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-primary/20 hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
