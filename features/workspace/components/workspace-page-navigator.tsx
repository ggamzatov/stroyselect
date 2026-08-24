"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, ListTree, X } from "lucide-react";

type NavItem = { id: string; label: string };

function slugify(value: string, index: number) {
  const base = value
    .toLocaleLowerCase("ru-RU")
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `workspace-section-${base || index + 1}-${index + 1}`;
}

function ensureUniqueTargetId(target: HTMLElement, preferredId: string, seenIds: Set<string>) {
  let candidate = preferredId;
  let suffix = 2;

  while (true) {
    const existing = document.getElementById(candidate);
    if (!seenIds.has(candidate) && (!existing || existing === target)) break;
    candidate = `${preferredId}-${suffix}`;
    suffix += 1;
  }

  if (target.id !== candidate) target.id = candidate;
  return candidate;
}

export function WorkspacePageNavigator() {
  const pathname = usePathname();
  const [items, setItems] = useState<NavItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const collect = () => {
      observer?.disconnect();
      const main = document.querySelector("main");
      if (!main) {
        setItems([]);
        return;
      }

      const headings = Array.from(main.querySelectorAll<HTMLElement>("h2"))
        .filter((heading) => heading.offsetParent !== null)
        .filter((heading) => (heading.textContent ?? "").trim().length > 0);

      const seenLabels = new Set<string>();
      const seenTargets = new Set<HTMLElement>();
      const seenIds = new Set<string>();
      const next: NavItem[] = [];

      headings.forEach((heading, index) => {
        const label = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
        if (!label || seenLabels.has(label)) return;

        const target = heading.closest<HTMLElement>("section, article") ?? heading;
        if (seenTargets.has(target)) return;

        const id = ensureUniqueTargetId(target, target.id || slugify(label, index), seenIds);
        target.style.scrollMarginTop = "9.5rem";

        seenLabels.add(label);
        seenTargets.add(target);
        seenIds.add(id);
        next.push({ id, label });
      });

      setItems(next);
      setActiveId((current) => next.some((item) => item.id === current) ? current : (next[0]?.id ?? ""));

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (visible?.target.id) setActiveId(visible.target.id);
        },
        { rootMargin: "-22% 0px -65% 0px", threshold: [0, 0.05, 0.2] },
      );
      next.forEach(({ id }) => {
        const target = document.getElementById(id);
        if (target) observer?.observe(target);
      });
    };

    const scheduleCollect = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(collect, 80);
    };

    mutationObserver = new MutationObserver(scheduleCollect);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    collect();

    return () => {
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  const visibleItems = useMemo(() => items.slice(0, 12), [items]);

  function goTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <style jsx global>{`
        main :where(h1, h2, h3, h4, p, li, dd, dt, a, span, strong, button) {
          overflow-wrap: anywhere;
          word-break: normal;
        }
        main :where(section, article, div) {
          min-width: 0;
        }
        main :where(pre, table) {
          max-width: 100%;
          overflow-x: auto;
        }
        main :where(img, video, iframe, canvas) {
          max-width: 100%;
        }
        main :where(input, textarea, select) {
          max-width: 100%;
          min-width: 0;
        }
      `}</style>

      {visibleItems.length >= 2 && (
        <>
          <div className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-2xl border border-border bg-card/95 p-2 shadow-[var(--shadow-floating)] backdrop-blur xl:hidden">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${activeId === item.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="fixed right-4 top-52 z-40 hidden xl:block">
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-4 py-3 text-sm font-bold text-foreground shadow-[var(--shadow-card)] backdrop-blur"
              >
                <ListTree className="h-4 w-4 text-primary" />
                Разделы
              </button>
            ) : (
              <aside className="w-56 rounded-[1.5rem] border border-border bg-card/95 p-3 shadow-[var(--shadow-floating)] backdrop-blur">
                <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <ListTree className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">На странице</span>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Свернуть навигацию">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <nav className="max-h-[calc(100vh-17rem)] space-y-1 overflow-y-auto">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(item.id)}
                      title={item.label}
                      className={`group flex w-full min-w-0 items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${activeId === item.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary/70"}`}
                    >
                      <span className="min-w-0 break-words leading-5 [overflow-wrap:anywhere]">{item.label}</span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </nav>
              </aside>
            )}
          </div>
        </>
      )}
    </>
  );
}
