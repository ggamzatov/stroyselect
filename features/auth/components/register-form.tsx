"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import { useForm } from
  "react-hook-form";

import { zodResolver } from
  "@hookform/resolvers/zod";

import {
  Building2,
  Check,
  Eye,
  EyeOff,
  Hammer,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  registerSchema,
  type RegisterInput,
} from
  "@/features/auth/schemas/register-schema";

import { registerUser } from
  "@/features/auth/actions/register";

export function RegisterForm() {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    serverError,
    setServerError,
  ] =
    useState<
      string | null
    >(null);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: {
      errors,
    },
  } =
    useForm<RegisterInput>({
      resolver:
        zodResolver(
          registerSchema
        ),

      defaultValues: {
        role:
          "customer",

        firstName:
          "",

        lastName:
          "",

        email:
          "",

        password:
          "",

        confirmPassword:
          "",

        consent:
          false as never,
      },
    });

  const selectedRole =
    watch("role");

  function onSubmit(
    values:
      RegisterInput
  ) {
    setServerError(
      null
    );

    startTransition(
      async () => {
        const result =
          await registerUser(
            values
          );

        if (
          !result.success
        ) {
          setServerError(
            result.message ??
              "Не удалось выполнить регистрацию"
          );

          return;
        }

        router.refresh();
      }
    );
  }

  return (
    <div className="w-full">
      <form
        onSubmit={
          handleSubmit(
            onSubmit
          )
        }
        className="space-y-6"
      >
        {/* Выбор роли */}

        <fieldset>
          <legend className="text-sm font-bold text-foreground">
            Как вы будете использовать сервис?
          </legend>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            От выбранной роли зависит ваш личный кабинет.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RoleCard
              value="customer"
              selected={
                selectedRole ===
                "customer"
              }
              title="Я заказчик"
              description="Размещаю проекты и выбираю подрядчиков."
              icon={
                <Building2 className="h-5 w-5" />
              }
              registerProps={
                register(
                  "role"
                )
              }
            />

            <RoleCard
              value="contractor"
              selected={
                selectedRole ===
                "contractor"
              }
              title="Я подрядчик"
              description="Получаю заказы и выполняю строительные работы."
              icon={
                <Hammer className="h-5 w-5" />
              }
              registerProps={
                register(
                  "role"
                )
              }
            />
          </div>

          {errors.role && (
            <p className="mt-2 text-sm font-medium text-destructive">
              {
                errors.role
                  .message
              }
            </p>
          )}
        </fieldset>

        {/* Имя и фамилия */}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Имя"
            icon={
              <UserRound className="h-4 w-4" />
            }
            error={
              errors.firstName
                ?.message
            }
          >
            <input
              id="firstName"
              autoComplete="given-name"
              className="stroy-input"
              placeholder="Ваше имя"
              {...register(
                "firstName"
              )}
            />
          </Field>

          <Field
            label="Фамилия"
            icon={
              <UserRound className="h-4 w-4" />
            }
            error={
              errors.lastName
                ?.message
            }
          >
            <input
              id="lastName"
              autoComplete="family-name"
              className="stroy-input"
              placeholder="Ваша фамилия"
              {...register(
                "lastName"
              )}
            />
          </Field>
        </div>

        {/* Email */}

        <Field
          label="Электронная почта"
          icon={
            <Mail className="h-4 w-4" />
          }
          error={
            errors.email
              ?.message
          }
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="stroy-input"
            placeholder="name@example.ru"
            {...register(
              "email"
            )}
          />
        </Field>

        {/* Пароли */}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Пароль"
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
            error={
              errors.password
                ?.message
            }
          >
            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                className="stroy-input pr-12"
                placeholder="Минимум 8 символов"
                {...register(
                  "password"
                )}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label={
                  showPassword
                    ? "Скрыть пароль"
                    : "Показать пароль"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          <Field
            label="Повторите пароль"
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
            error={
              errors.confirmPassword
                ?.message
            }
          >
            <div className="relative">
              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                className="stroy-input pr-12"
                placeholder="Повторите пароль"
                {...register(
                  "confirmPassword"
                )}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label={
                  showConfirmPassword
                    ? "Скрыть пароль"
                    : "Показать пароль"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>
        </div>

        {/* Согласие */}

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-[1.25rem] border border-border bg-background/60 p-4 transition hover:border-primary/20">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
              {...register(
                "consent"
              )}
            />

            <span className="text-sm leading-6 text-muted-foreground">
              Я принимаю пользовательское соглашение
              и даю согласие на обработку
              персональных данных.
            </span>
          </label>

          {errors.consent && (
            <p className="mt-2 text-sm font-medium text-destructive">
              {
                errors.consent
                  .message
              }
            </p>
          )}
        </div>

        {/* Ошибка сервера */}

        {serverError && (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {serverError}
          </div>
        )}

        {/* Кнопка */}

        <button
          type="submit"
          disabled={
            isPending
          }
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />

              Создаём аккаунт...
            </>
          ) : (
            <>
              Создать аккаунт
            </>
          )}
        </button>

        {/* Подсказка роли */}

        <RoleHint
          role={
            selectedRole
          }
        />
      </form>
    </div>
  );
}

function RoleCard({
  value,
  selected,
  title,
  description,
  icon,
  registerProps,
}: {
  value:
    | "customer"
    | "contractor";

  selected:
    boolean;

  title:
    string;

  description:
    string;

  icon:
    React.ReactNode;

  registerProps:
    ReturnType<
      ReturnType<
        typeof useForm<RegisterInput>
      >["register"]
    >;
}) {
  return (
    <label
      className={[
        "group relative cursor-pointer rounded-[1.4rem] border p-5 transition duration-200",
        selected
          ? "border-primary/40 bg-secondary shadow-[var(--shadow-soft)]"
          : "border-border bg-background/60 hover:border-primary/20 hover:bg-secondary/30",
      ].join(
        " "
      )}
    >
      <input
        type="radio"
        value={value}
        className="sr-only"
        {...registerProps}
      />

      <div className="flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl transition",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-primary",
          ].join(
            " "
          )}
        >
          {icon}
        </div>

        <span
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full border transition",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-transparent",
          ].join(
            " "
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className="mt-5 font-bold text-foreground">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </label>
  );
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label:
    string;

  icon?:
    React.ReactNode;

  error?:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon && (
          <span className="text-primary">
            {icon}
          </span>
        )}

        <label className="text-sm font-semibold text-foreground">
          {label}
        </label>
      </div>

      {children}

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function RoleHint({
  role,
}: {
  role:
    | "customer"
    | "contractor";
}) {
  if (
    role ===
    "contractor"
  ) {
    return (
      <div className="rounded-[1.25rem] bg-secondary/60 p-4">
        <p className="text-sm font-semibold text-primary">
          Аккаунт подрядчика
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          После регистрации заполните профиль компании,
          специализации и города работы. После проверки
          профиля вы получите доступ к проектам заказчиков.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] bg-secondary/60 p-4">
      <p className="text-sm font-semibold text-primary">
        Аккаунт заказчика
      </p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        После регистрации вы сможете создать первый
        проект, опубликовать его и получать предложения
        от подрядчиков.
      </p>
    </div>
  );
}