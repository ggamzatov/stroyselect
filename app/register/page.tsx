import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

import { RegisterForm } from
  "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Регистрация | СтройВыбор",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1fr_600px]">
        {/* Левая часть */}

        <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />

          <Link
            href="/"
            className="relative text-2xl font-black tracking-[-0.045em]"
          >
            СтройВыбор
          </Link>

          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <ShieldCheck className="h-4 w-4" />

              Платформа для заказчиков и подрядчиков
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[1.05] tracking-[-0.055em] xl:text-6xl">
              Создайте аккаунт и начните работать со строительными проектами
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-primary-foreground/70">
              Выберите свою роль, создайте профиль и
              получите доступ к инструментам платформы.
            </p>

            <div className="mt-9 space-y-4">
              <Feature text="Заказчики размещают проекты и выбирают подрядчиков" />

              <Feature text="Подрядчики получают подходящие строительные заказы" />

              <Feature text="Весь проект ведётся в едином рабочем пространстве" />

              <Feature text="Этапы, документы, фотографии и чат находятся в одном месте" />
            </div>
          </div>

          <div className="relative">
            <p className="text-sm text-primary-foreground/50">
              СтройВыбор
            </p>

            <p className="mt-1 text-xs text-primary-foreground/35">
              Строительство начинается с правильного выбора
            </p>
          </div>
        </section>

        {/* Правая часть */}

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-secondary/50 blur-3xl lg:hidden" />

          <div className="relative w-full max-w-lg">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />

              На главную
            </Link>

            <div className="mt-10 lg:hidden">
              <Link
                href="/"
                className="text-2xl font-black tracking-[-0.045em] text-foreground"
              >
                СтройВыбор
              </Link>
            </div>

            <div className="mt-8 lg:mt-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <UserRoundPlus className="h-5 w-5" />
              </div>

              <p className="mt-6 text-sm font-semibold text-primary">
                Новый аккаунт
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                Регистрация
              </h1>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Выберите роль и заполните основные данные.
                После регистрации вы попадёте в соответствующий
                личный кабинет.
              </p>
            </div>

            {/* Существующая форма регистрации */}

            <div className="mt-8">
              <RegisterForm />
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-center text-sm text-muted-foreground">
                Уже зарегистрированы?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary transition hover:underline"
                >
                  Войти
                </Link>
              </p>
            </div>

            <p className="mt-8 text-center text-xs leading-5 text-muted-foreground/70">
              Создавая аккаунт, вы соглашаетесь
              с правилами использования платформы.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-primary-foreground/85">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
        <CheckCircle2 className="h-4 w-4" />
      </span>

      <span className="leading-6">
        {text}
      </span>
    </div>
  );
}