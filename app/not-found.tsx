import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <SearchX className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Ошибка 404</p>
        <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">Страница не найдена</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Возможно, ссылка устарела или раздел был перемещён. Вернитесь на предыдущую страницу либо откройте главную СтройВыбор.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            <Home className="h-4 w-4" />На главную
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground">
            <ArrowLeft className="h-4 w-4" />В личный кабинет
          </Link>
        </div>
      </section>
    </main>
  );
}
