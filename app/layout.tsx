import type { Metadata } from "next";

import "./globals.css";

import { ClientErrorReporter } from "@/features/observability/components/client-error-reporter";

export const metadata: Metadata = {
  title: "StroySelect",
  description:
    "Сервис подбора подрядчиков и управления строительными проектами",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
