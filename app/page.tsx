import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Hammer,
  MessageSquareText,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="app-container flex min-h-20 items-center justify-between gap-6">
          <Link
            href="/"
            className="text-xl font-black tracking-[-0.04em] text-foreground"
          >
            СтройВыбор
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-foreground transition hover:bg-secondary sm:inline-flex"
            >
              Войти
            </Link>

            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[#5c3b2a]"
            >
              Регистрация

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-secondary blur-3xl" />

        <div className="app-container relative grid min-h-[690px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-[var(--shadow-soft)]">
              <ShieldCheck className="h-4 w-4" />

              Подрядчики проходят проверку
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black tracking-[-0.055em] text-foreground sm:text-5xl lg:text-7xl">
              Найдите надёжного подрядчика для строительства
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Разместите проект, получите предложения
              от проверенных подрядчиков, сравните цены,
              сроки и портфолио — и ведите весь проект
              в одном рабочем пространстве.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-semibold text-primary-foreground shadow-[0_15px_35px_rgba(107,70,50,0.22)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a]"
              >
                Разместить проект

                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/register"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 font-semibold text-foreground transition hover:border-primary/25 hover:bg-secondary/50"
              >
                Я подрядчик
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <FeatureCheck text="Бесплатное размещение проекта" />
              <FeatureCheck text="Сравнение предложений" />
              <FeatureCheck text="Контроль этапов работ" />
            </div>
          </div>

          <HeroDashboardPreview />
        </div>
      </section>

      <section className="app-container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-primary">
            Как это работает
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
            От заявки до завершённого объекта
          </h2>

          <p className="mt-4 text-base leading-7 text-muted-foreground">
            СтройВыбор объединяет поиск подрядчика,
            выбор предложения и контроль строительства
            в одном сервисе.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <StepCard
            number="01"
            icon={
              <Building2 className="h-5 w-5" />
            }
            title="Опишите проект"
            description="Укажите вид работ, объект, город, бюджет и желаемые сроки."
          />

          <StepCard
            number="02"
            icon={
              <UsersRound className="h-5 w-5" />
            }
            title="Получите предложения"
            description="Подрядчики предлагают стоимость, срок выполнения и дату начала работ."
          />

          <StepCard
            number="03"
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            title="Контролируйте работу"
            description="Этапы, фотографии, документы, чат и история проекта находятся в одном месте."
          />
        </div>
      </section>

      <section className="border-y border-border bg-secondary/30">
        <div className="app-container py-20">
          <div className="grid gap-6 lg:grid-cols-2">
            <AudienceCard
              eyebrow="Для заказчиков"
              title="Выбирайте подрядчика на основе фактов"
              description="Сравнивайте предложения, рейтинг, портфолио и опыт компании до принятия решения."
              icon={
                <Building2 className="h-6 w-6" />
              }
              href="/register"
              buttonText="Создать проект"
              features={[
                "Несколько предложений на один проект",
                "Публичные профили и портфолио",
                "Приёмка каждого этапа",
                "Фото, документы и чат",
              ]}
            />

            <AudienceCard
              eyebrow="Для подрядчиков"
              title="Получайте подходящие строительные проекты"
              description="Создайте профиль компании, укажите специализации и откликайтесь на подходящие заказы."
              icon={
                <Hammer className="h-6 w-6" />
              }
              href="/register"
              buttonText="Стать подрядчиком"
              features={[
                "Проекты по специализации и городу",
                "Собственный профиль и портфолио",
                "Управление этапами работ",
                "Рейтинг и отзывы заказчиков",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="app-container py-20">
        <div className="grid gap-5 md:grid-cols-3">
          <TrustCard
            icon={
              <BadgeCheck className="h-5 w-5" />
            }
            title="Проверка подрядчиков"
            description="Профили компаний проходят модерацию перед получением доступа к проектам."
          />

          <TrustCard
            icon={
              <MessageSquareText className="h-5 w-5" />
            }
            title="Всё зафиксировано"
            description="Чат, этапы, документы и события проекта остаются в рабочем пространстве."
          />

          <TrustCard
            icon={
              <Star className="h-5 w-5" />
            }
            title="Репутация"
            description="После завершения проекта заказчик может оценить качество, сроки и коммуникацию."
          />
        </div>
      </section>

      <section className="app-container pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-7 text-primary-foreground shadow-[0_25px_70px_rgba(107,70,50,0.25)] md:p-12">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-foreground/70">
                Начните сейчас
              </p>

              <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-[-0.04em] md:text-4xl">
                Строительный проект начинается с правильного выбора
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/75">
                Создайте заявку и получите предложения
                от подрядчиков в одном месте.
              </p>
            </div>

            <Link
              href="/register"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-semibold text-primary transition hover:-translate-y-0.5"
            >
              Создать аккаунт

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="app-container flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-foreground">
            СтройВыбор
          </p>

          <p>
            Сервис для заказчиков и подрядчиков
          </p>
        </div>
      </footer>
    </main>
  );
}

function HeroDashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-primary/10 blur-3xl" />

      <div className="relative rounded-[2rem] border border-border bg-card p-5 shadow-[0_30px_80px_rgba(55,35,24,0.16)] sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Ваш проект
            </p>

            <p className="mt-1 font-bold text-foreground">
              Строительство частного дома
            </p>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            В работе
          </span>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-secondary/60 p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Прогресс
              </p>

              <p className="mt-1 text-3xl font-black text-primary">
                65%
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              3 из 5 этапов
            </p>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-background">
            <div className="h-full w-[65%] rounded-full bg-primary" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MiniCard
            title="Предложения"
            value="7"
            description="от подрядчиков"
          />

          <MiniCard
            title="Бюджет"
            value="4,8 млн ₽"
            description="принятое предложение"
          />
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Текущий этап
          </p>

          <p className="mt-2 font-bold text-foreground">
            Возведение стен
          </p>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Доля проекта
            </span>

            <strong className="text-foreground">
              25%
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <p className="text-xs text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-foreground">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function FeatureCheck({
  text,
}: {
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      {text}
    </span>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>

        <span className="text-sm font-black text-primary/40">
          {number}
        </span>
      </div>

      <h3 className="mt-6 text-xl font-black text-foreground">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </article>
  );
}

function AudienceCard({
  eyebrow,
  title,
  description,
  icon,
  href,
  buttonText,
  features,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonText: string;
  features: string[];
}) {
  return (
    <article className="rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow-soft)] md:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        {icon}
      </div>

      <p className="mt-6 text-sm font-semibold text-primary">
        {eyebrow}
      </p>

      <h3 className="mt-2 text-2xl font-black tracking-tight text-foreground">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {description}
      </p>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-start gap-3 text-sm text-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {feature}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
      >
        {buttonText}

        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function TrustCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>

      <h3 className="mt-5 font-black text-foreground">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </article>
  );
}