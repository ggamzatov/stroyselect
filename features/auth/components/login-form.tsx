"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      console.error("Ошибка входа:", error);

      setMessage(
        translateLoginError(error.message)
      );

      setIsLoading(false);
      return;
    }

    if (!data.user) {
      setMessage(
        "Пользователь не найден после входа"
      );

      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
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
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
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
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-md border px-3"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 h-11 w-full rounded-md bg-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Выполняется вход..." : "Войти"}
      </button>

      {message && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}

function translateLoginError(message: string) {
  switch (message) {
    case "Invalid login credentials":
      return "Неверная электронная почта или пароль";

    case "Email not confirmed":
      return "Подтвердите электронную почту по ссылке из письма";

    default:
      return message;
  }
}