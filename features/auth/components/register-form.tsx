"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/register-schema";
import { registerUser } from "@/features/auth/actions/register";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "customer",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      consent: false as never,
    },
  });

  const selectedRole = watch("role");

  function onSubmit(values: RegisterInput) {
    setServerError(null);

    startTransition(async () => {
      const result = await registerUser(values);

      if (!result.success) {
        setServerError(
          result.message ?? "Не удалось выполнить регистрацию"
        );
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-2xl">
          Создание учетной записи
        </CardTitle>
        <CardDescription>
          Выберите роль и заполните основные данные.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              Как вы будете использовать сервис?
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border p-4 ${
                  selectedRole === "customer"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  value="customer"
                  className="sr-only"
                  {...register("role")}
                />

                <span className="font-semibold">
                  Я заказчик
                </span>

                <span className="mt-1 block text-sm text-slate-600">
                  Хочу найти подрядчика.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-xl border p-4 ${
                  selectedRole === "contractor"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  value="contractor"
                  className="sr-only"
                  {...register("role")}
                />

                <span className="font-semibold">
                  Я подрядчик
                </span>

                <span className="mt-1 block text-sm text-slate-600">
                  Хочу получать заказы.
                </span>
              </label>
            </div>

            {errors.role && (
              <p className="text-sm text-red-600">
                {errors.role.message}
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Электронная почта</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Повторите пароль
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              {...register("consent")}
            />
            <span className="text-sm text-slate-600">
              Я принимаю пользовательское соглашение и согласен
              на обработку персональных данных.
            </span>
          </label>

          {errors.consent && (
            <p className="text-sm text-red-600">
              {errors.consent.message}
            </p>
          )}

          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending
              ? "Создаем учетную запись..."
              : "Зарегистрироваться"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}