"use client";

import { useState } from "react";

import {
  loginUser,
} from "@/features/auth/actions/login";

export function LoginForm() {
  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsLoading(true);

    try {
      const result =
        await loginUser({
          email:
            email.trim(),

          password,
        });

      /*
       * При успешном входе loginUser()
       * делает redirect("/dashboard"),
       * поэтому до этого места код
       * обычно не дойдёт.
       */

      if (
        result &&
        !result.success
      ) {
        setMessage(
          result.message ??
          "Не удалось выполнить вход"
        );

        setIsLoading(false);
      }
    } catch (error) {
      /*
       * Next.js redirect внутри
       * Server Action может проявляться
       * как специальное исключение.
       *
       * Его нельзя превращать
       * в пользовательскую ошибку.
       */
      if (
        isNextRedirectError(
          error
        )
      ) {
        throw error;
      }

      console.error(
        "Ошибка входа:",
        error
      );

      setMessage(
        "Не удалось выполнить вход"
      );

      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="w-full max-w-md rounded-xl border bg-white p-6"
    >
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium"
        >
          Электронная почта
        </label>

        <input
          id="email"
          type="email"
          value={
            email
          }
          onChange={(
            event
          ) =>
            setEmail(
              event.target.value
            )
          }
          required
          autoComplete="email"
          className="h-11 w-full rounded-md border px-3"
        />
      </div>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium"
        >
          Пароль
        </label>

        <input
          id="password"
          type="password"
          value={
            password
          }
          onChange={(
            event
          ) =>
            setPassword(
              event.target.value
            )
          }
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-md border px-3"
        />
      </div>

      <button
        type="submit"
        disabled={
          isLoading
        }
        className="mt-5 h-11 w-full rounded-md bg-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "Выполняется вход..."
          : "Войти"}
      </button>

      {message && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}

function isNextRedirectError(
  error: unknown
) {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !(
      "digest" in error
    )
  ) {
    return false;
  }

  const digest =
    (
      error as {
        digest?:
          unknown;
      }
    ).digest;

  return (
    typeof digest ===
      "string" &&
    digest.startsWith(
      "NEXT_REDIRECT"
    )
  );
}