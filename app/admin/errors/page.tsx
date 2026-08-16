import {
  AlertTriangle,
  CheckCircle2,
  MonitorCog,
  ServerCrash,
  UserRound,
} from "lucide-react";

import { getApplicationErrors } from "@/features/admin/errors/queries/get-application-errors";
import { resolveApplicationError } from "@/features/admin/errors/actions/resolve-application-error";

export default async function AdminErrorsPage() {
  const errors = await getApplicationErrors();
  const unresolved = errors.filter((item) => !item.resolved_at).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Мониторинг приложения</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
              Ошибки пользователей
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Здесь собираются необработанные серверные ошибки, ошибки рендера и JavaScript-ошибки браузера с маршрутом и пользователем, когда его удалось определить.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 px-5 py-4">
            <p className="text-xs text-muted-foreground">Не закрыто</p>
            <p className="mt-1 text-3xl font-black text-destructive">{unresolved}</p>
          </div>
        </div>
      </section>

      {errors.length === 0 ? (
        <section className="rounded-[1.75rem] border border-dashed border-border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 text-lg font-bold text-foreground">Ошибок пока нет</h2>
          <p className="mt-2 text-sm text-muted-foreground">Новые ошибки появятся здесь автоматически.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {errors.map((item) => (
            <article
              key={item.id}
              className={[
                "rounded-[1.5rem] border bg-card p-5 shadow-[var(--shadow-soft)]",
                item.resolved_at ? "border-border opacity-75" : "border-red-200 dark:border-red-900/60",
              ].join(" ")}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={[
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                      item.source === "client"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
                    ].join(" ")}>
                      {item.source === "client" ? <MonitorCog className="h-3.5 w-3.5" /> : <ServerCrash className="h-3.5 w-3.5" />}
                      {item.source}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
                    {item.resolved_at && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Закрыта
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 break-words text-base font-bold text-foreground">
                    {item.message}
                  </h2>

                  <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <Meta label="Маршрут" value={item.route || "—"} />
                    <Meta label="Метод" value={item.method || "—"} />
                    <Meta label="Digest" value={item.digest || "—"} />
                    <Meta
                      label="Пользователь"
                      value={formatUser(item)}
                      icon={<UserRound className="h-3.5 w-3.5" />}
                    />
                  </div>

                  {item.stack && (
                    <details className="mt-4 rounded-xl border border-border bg-background/70 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">
                        {item.stack}
                      </pre>
                    </details>
                  )}
                </div>

                {!item.resolved_at && (
                  <form action={resolveApplicationError}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground transition hover:bg-secondary">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Отметить решённой
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm leading-6">
            В журнал попадают технические ошибки. Обычная бизнес-валидация вроде «заполните поле» или «нет доступа» не считается сбоем и сюда не записывается.
          </p>
        </div>
      </section>
    </div>
  );
}

function Meta({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-secondary/40 p-3">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]">{icon}{label}</p>
      <p className="mt-1 break-words font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatUser(item: {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
}) {
  const name = [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
  return [name || item.email || "Не определён", item.role].filter(Boolean).join(" · ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
