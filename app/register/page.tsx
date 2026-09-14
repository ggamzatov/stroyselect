import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft, CheckCircle2, ShieldCheck, UserRoundPlus } from "lucide-react";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Регистрация | StroySelect" };

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_620px]">
        <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />
          <Link href="/" className="relative text-2xl font-black tracking-[-0.05em]">StroySelect</Link>

          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Один аккаунт — нужный сценарий
            </div>
            <h1 className="mt-7 text-5xl font-black leading-[1.03] tracking-[-0.055em] xl:text-6xl">Начните с задачи или подключите свою компанию</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-primary-foreground/72">После регистрации StroySelect покажет именно те инструменты, которые нужны вашей роли: заказчику или подрядчику.</p>
            <div className="mt-9 space-y-4">
              <Feature text="Заказчик размещает задачу и сравнивает предложения" />
              <Feature text="Подрядчик показывает специализации и принимает заказы" />
              <Feature text="Проект после выбора переходит в рабочее пространство" />
              <Feature text="Этапы, документы, фотографии и чат остаются рядом" />
            </div>
          </div>

          <div className="relative"><p className="text-sm font-semibold text-primary-foreground/55">StroySelect</p><p className="mt-1 text-xs text-primary-foreground/35">Для заказчиков и подрядчиков</p></div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-secondary/55 blur-3xl lg:hidden" />
          <div className="relative w-full max-w-lg">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />На главную</Link>
              <Link href="/login" className="text-sm font-semibold text-primary hover:underline">Уже есть аккаунт</Link>
            </div>

            <div className="mt-8 lg:mt-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><UserRoundPlus className="h-5 w-5" aria-hidden="true" /></div>
              <p className="mt-6 text-sm font-bold text-primary">Новый аккаунт</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Регистрация в StroySelect</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Выберите роль и заполните основные данные. После регистрации вы попадёте в соответствующий кабинет.</p>
            </div>

            <div className="mt-7 rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"><RegisterForm /></div>

            <div className="mt-7 flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/45 p-4 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p>Регистрация создаёт аккаунт и направляет вас в кабинет согласно выбранной роли.</p>
            </div>

            <p className="mt-7 text-center text-xs leading-5 text-muted-foreground/70">Создавая аккаунт, вы соглашаетесь с правилами использования платформы.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="flex items-start gap-3 text-sm text-primary-foreground/85"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span><span className="leading-6">{text}</span></div>;
}
