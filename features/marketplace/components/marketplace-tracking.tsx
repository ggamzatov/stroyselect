"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

type EventName =
  | "catalog_viewed"
  | "contractor_profile_viewed"
  | "service_city_viewed"
  | "project_cta_clicked";

type Metadata = Record<string, string | boolean | undefined>;

export function GlobalMarketplaceTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const event = resolvePageEvent(pathname);
    if (event) {
      const query = new URLSearchParams(window.location.search);
      void sendMarketplaceEvent(event.eventName, event.contractorId, {
        path: pathname,
        city: event.city,
        category: event.category,
        searchUsed: Boolean(query.get("search")),
        filtersUsed: Array.from(query.keys()).some((key) => key !== "page"),
      });
    }

    function handleClick(clickEvent: MouseEvent) {
      const target = clickEvent.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/register") && !href.startsWith("/customer/projects/new")) return;
      if (!isPublicMarketplacePath(pathname)) return;

      void sendMarketplaceEvent("project_cta_clicked", event?.contractorId, {
        path: pathname,
        source: event?.eventName ?? "public_marketplace",
        city: event?.city,
        category: event?.category,
      });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  return null;
}

export function MarketplacePageView({
  eventName,
  contractorId,
  metadata,
}: {
  eventName: EventName;
  contractorId?: string;
  metadata?: Metadata;
}) {
  useEffect(() => {
    void sendMarketplaceEvent(eventName, contractorId, metadata);
  }, [eventName, contractorId, metadata]);

  return null;
}

export function MarketplaceTrackedLink({
  eventName,
  contractorId,
  metadata,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  eventName: EventName;
  contractorId?: string;
  metadata?: Metadata;
  children: ReactNode;
}) {
  return (
    <Link
      {...props}
      onClick={() => {
        void sendMarketplaceEvent(eventName, contractorId, metadata);
      }}
    >
      {children}
    </Link>
  );
}

function resolvePageEvent(pathname: string) {
  if (pathname === "/contractors") {
    return { eventName: "catalog_viewed" as const };
  }

  const contractorMatch = pathname.match(/^\/contractors\/([0-9a-f-]{36})$/i);
  if (contractorMatch) {
    return {
      eventName: "contractor_profile_viewed" as const,
      contractorId: contractorMatch[1],
    };
  }

  const serviceMatch = pathname.match(/^\/services\/([^/]+)\/([^/]+)$/);
  if (serviceMatch) {
    return {
      eventName: "service_city_viewed" as const,
      category: decodeURIComponent(serviceMatch[1]),
      city: decodeURIComponent(serviceMatch[2]).replace(/-/g, " "),
    };
  }

  return null;
}

function isPublicMarketplacePath(pathname: string) {
  return pathname === "/contractors" || pathname.startsWith("/contractors/") || pathname.startsWith("/services/");
}

async function sendMarketplaceEvent(
  eventName: EventName,
  contractorId?: string,
  metadata?: Metadata
) {
  try {
    await fetch("/api/marketplace/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ eventName, contractorId, metadata }),
    });
  } catch {
    // Product analytics must never interrupt the user's primary action.
  }
}
