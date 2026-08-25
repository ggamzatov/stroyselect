import Link from "next/link";
import { Home, SearchX } from "lucide-react";

import "./globals.css";

export const metadata = {
  title: "Страница не найдена — СтройВыбор",
  description: "Запрошенная страница не существует или была перемещена.",
};

export default function GlobalNotFound() {
  return (
    <html lang="ru">
      <body className="antialiased">
        <main className="min-h-screen bg-background px-4 py-16">
          <section className="mx-auto max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <SearchX className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Ошибка 404</p>
            <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">Страница не найдена</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Возможно, ссылка устарела или раздел был перемещён. Вернитесь на главную страницу СтройВыбор и продолжите работу оттуда.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                <Home className="h-4 w-4" />На главную
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
