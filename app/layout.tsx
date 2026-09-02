import type { Metadata } from "next";

import "./globals.css";

import { ClientErrorReporter } from "@/features/observability/components/client-error-reporter";
import { GlobalMarketplaceTracking } from "@/features/marketplace/components/marketplace-tracking";

export const metadata: Metadata = {
  title: "StroySelect",
  description: "Сервис подбора подрядчиков и управления строительными проектами",
  icons: {
    icon: "/brand/stroyvybor-mark.svg",
    shortcut: "/brand/stroyvybor-mark.svg",
    apple: "/brand/stroyvybor-mark.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <style>{`
          :where(h1, h2, h3, h4, h5, h6, p, li, dd, dt, a, span, strong, button) {
            overflow-wrap: anywhere;
            word-break: normal;
          }
          :where(section, article, main, aside, header, footer, nav, div) {
            min-width: 0;
          }
          :where(pre, table) {
            max-width: 100%;
            overflow-x: auto;
          }
          :where(img, video, iframe, canvas, svg) {
            max-width: 100%;
          }
          :where(input, textarea, select) {
            max-width: 100%;
            min-width: 0;
          }
        `}</style>
        <ClientErrorReporter />
        <GlobalMarketplaceTracking />
        {children}
      </body>
    </html>
  );
}
