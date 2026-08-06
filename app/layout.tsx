import type { Metadata } from "next";

import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}