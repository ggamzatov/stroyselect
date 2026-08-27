import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  FolderKanban,
  Hammer,
  House,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { AdSlot } from "@/features/ads/components/ad-slot";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="app-container flex min-h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="СтройВыбор — главная">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_22px_rgba(8,122,80,0.2)]">
              <House className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-black tracking-[-0.045em]">СтройВыбор</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Публичная навигация">
            <Link href="/contractors" className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground">
              Подрядчики
            </Link>
            <Link href="/legal/terms" className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground">
              Условия
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-foreground transition hover:bg-secondary">
              Войти
            </Link>
            <Link href="/register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)] sm:px-5">
              Регистрация
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/80">
        <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-secondary blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-12 h-[420px] w-[420px] rounded-full bg-accent/55 blur-3xl" />

        <div className="app-container relative grid min-h-[680px] items-center gap-10 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-primary shadow-[var(--shadow-soft)]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Проект, подрядчик и работа — в одном сервисе
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-7xl">
              Строительство без хаоса и потерянных договорённостей
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Разместите задачу, сравните предложения проверенных подрядчиков и ведите работы
              по этапам — с чатом, материалами, документами и платежами внутри проекта.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-bold text-primary-foreground shadow-[0_14px_34px_rgba(8,122,80,0.2)] transition hover:-translate-y-0.5 hover:bg-[#076c47]">
                Создать проект
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/contractors" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 font-bold text-foreground shadow-[var(--shadow-soft)] transition hover:border-primary/25 hover:bg-secondary">
                <Search className="h-4 w-4 text-primary" aria-hidden="true" />
                Найти подрядчика
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroPoint text="Проверка профилей" />
              <HeroPoint text="Контроль этапов" />
              <HeroPoint text="Единая история проекта" />
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <AdSlot placement="home_premium" className="app-container pt-7" />

      <section className="app-container py-16 sm:py-20">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Как работает СтройВыбор</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              От первой задачи до принятого этапа
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground lg:justify-self-end">
            Сервис не заменяет договорённости сторон — он делает их прозрачными: фиксирует
            предложения, договор, этапы, сообщения, файлы и финансовые события в одном проекте.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FlowCard number="01" icon={<FileText className="h-5 w-5" />} title="Опишите задачу" text="Категория, объект, бюджет, город и сроки формируют понятную заявку." />
          <FlowCard number="02" icon={<UsersRound className="h-5 w-5" />} title="Сравните предложения" text="Стоимость, длительность и условия подрядчиков собраны в одном формате." />
          <FlowCard number="03" icon={<FolderKanban className="h-5 w-5" />} title="Работайте по этапам" text="Фото, документы, замечания и история остаются внутри рабочего пространства." />
          <FlowCard number="04" icon={<CheckCircle2 className="h-5 w-5" />} title="Принимайте результат" text="Каждый этап получает понятный статус и отдельное действие заказчика." />
        </div>
      </section>

      <section className="border-y border-border bg-secondary/35">
        <div className="app-container py-16 sm:py-20">
          <div className="grid gap-5 lg:grid-cols-2">
            <AudienceCard
              eyebrow="Заказчику"
              title="Один интерфейс вместо десятков чатов и таблиц"
              text="Создавайте проекты, получайте предложения, выбирайте исполнителя и контролируйте объект по фактам."
              icon={<Building2 className="h-6 w-6" />}
              action="Разместить проект"
              href="/register"
              points={["Подбор подрядчиков", "Сравнение предложений", "Этапы и приёмка", "Документы и платежи"]}
            />
            <AudienceCard
              eyebrow="Подрядчику"
              title="Подходящие заказы и рабочие объекты в одном кабинете"
              text="Покажите специализацию компании, откликайтесь на проекты и ведите выбранные объекты вместе с заказчиком."
              icon={<Hammer className="h-6 w-6" />}
              action="Создать профиль"
              href="/register"
              points={["Matching по профилю", "Предложения и версии", "Рабочее пространство", "Финансы и документы"]}
            />
          </div>
        </div>
      </section>

      <section className="app-container py-16 sm:py-20">
        <div className="ui-v2-panel relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-[radial-gradient(circle_at_65%_45%,rgba(170,216,190,0.7),transparent_60%)] lg:block" />
          <div className="relative max-w-3xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Начните с одной задачи
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Регистрация открывает нужный кабинет в зависимости от роли. Вы сможете заполнить
              проект или профиль подрядчика уже после входа.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground">
                Создать аккаунт
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-5 font-bold transition hover:bg-secondary">
                У меня уже есть аккаунт
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="app-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-black">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <House className="h-4 w-4" aria-hidden="true" />
            </span>
            СтройВыбор
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground" aria-label="Правовая информация">
            <Link href="/legal/terms" className="hover:text-primary">Условия использования</Link>
            <Link href="/legal/privacy" className="hover:text-primary">Политика конфиденциальности</Link>
            <Link href="/contractors" className="hover:text-primary">Каталог подрядчиков</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:justify-self-end">
      <div className="ui-v2-panel overflow-hidden p-3 shadow-[var(--shadow-floating)] sm:p-4">
        <div className="rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">В работе</span>
                <span className="text-[11px] text-muted-foreground">Рабочее пространство</span>
              </div>
              <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">Ремонт квартиры</h2>
              <p className="mt-1 text-xs text-muted-foreground">Все действия проекта собраны в одном месте</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <House className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <PreviewStat icon={<FolderKanban className="h-4 w-4" />} label="Этапы" text="Статусы и приёмка" />
            <PreviewStat icon={<MessageCircle className="h-4 w-4" />} label="Чат" text="История решений" />
            <PreviewStat icon={<FileText className="h-4 w-4" />} label="Документы" text="Версии и файлы" />
          </div>

          <div className="mt-4 rounded-2xl border border-primary/15 bg-secondary/65 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">Следующее действие</p>
                <p className="mt-1 font-black">Проверить результат этапа</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Заказчик видит действие тогда, когда оно действительно требуется по состоянию проекта.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      {text}
    </div>
  );
}

function FlowCard({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="ui-v2-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span>
        <span className="text-xs font-black text-muted-foreground">{number}</span>
      </div>
      <h3 className="mt-5 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}

function AudienceCard({ eyebrow, title, text, icon, action, href, points }: { eyebrow: string; title: string; text: string; icon: React.ReactNode; action: string; href: string; points: string[] }) {
  return (
    <article className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-7">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">{icon}</span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {points.map((point) => (
          <div key={point} className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {point}
          </div>
        ))}
      </div>
      <Link href={href} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold text-primary transition hover:bg-secondary">
        {action}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function PreviewStat({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-bold text-foreground">{label}</span></div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{text}</p>
    </div>
  );
}
