import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-slate-900">
            СтройВыбор
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="/contractors"
              className="text-sm font-medium text-slate-700 hover:text-slate-950"
            >
              Подрядчики
            </Link>

            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-950"
            >
              Войти
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Регистрация
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-700">
            Проверенные подрядчики
          </p>

          <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
            Найдите надежного подрядчика для строительства
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Опишите свой проект один раз, получите предложения проверенных
            компаний и сравните цены, сроки, опыт и гарантии.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/projects/new"
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Разместить проект
            </Link>

            <Link
              href="/contractors"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100"
            >
              Найти подрядчика
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">
            Как это работает
          </h2>

          <ol className="mt-6 space-y-5">
            <li className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                1
              </span>
              <div>
                <h3 className="font-semibold text-slate-950">
                  Опишите проект
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Укажите вид работ, объект, бюджет, сроки и город.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                2
              </span>
              <div>
                <h3 className="font-semibold text-slate-950">
                  Получите предложения
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Проверенные подрядчики направят предложения по единой форме.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                3
              </span>
              <div>
                <h3 className="font-semibold text-slate-950">
                  Сравните и выберите
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Сравните стоимость, сроки, гарантию, рейтинг и опыт.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}