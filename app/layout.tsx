import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "СтройВыбор",
    template: "%s | СтройВыбор",
  },
  description:
    "Сервис подбора и проверки подрядчиков для строительства и ремонта.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}