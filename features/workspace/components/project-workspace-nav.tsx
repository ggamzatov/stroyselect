"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  FileText,
  FolderOpen,
  ListChecks,
  ShieldAlert,
} from "lucide-react";

type Props = {
  projectId: string;
  role: "customer" | "contractor";
};

const items = [
  {
    suffix: "",
    label: "Обзор",
    icon: FolderOpen,
  },
  {
    suffix: "/changes",
    label: "Бюджет и платежи",
    icon: Banknote,
  },
  {
    suffix: "/documents",
    label: "Документы",
    icon: FileText,
  },
  {
    suffix: "/issues",
    label: "Замечания",
    icon: ListChecks,
  },
  {
    suffix: "/disputes",
    label: "Споры",
    icon: ShieldAlert,
  },
] as const;

export function ProjectWorkspaceNav({ projectId, role }: Props) {
  const pathname = usePathname();
  const base = `/${role}/work/${projectId}`;

  return (
    <nav
      aria-label="Разделы рабочего пространства"
      className="border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="app-container overflow-x-auto py-3">
        <div className="flex min-w-max gap-2">
          {items.map((item) => {
            const href = `${base}${item.suffix}`;
            const active = item.suffix
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === base;
            const Icon = item.icon;

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
                <Icon
                  className={[
                    "h-4 w-4",
                    active ? "text-primary-foreground" : "text-primary",
                  ].join(" ")}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
