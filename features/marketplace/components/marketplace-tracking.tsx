"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ComponentProps, ReactNode } from "react";

type EventName =
  | "catalog_viewed"
  | "contractor_profile_viewed"
  | "service_city_viewed"
  | "project_cta_clicked";

type Metadata = Record<string, string | boolean | undefined>;

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
