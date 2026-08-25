"use client";

import { useState, useTransition } from "react";

import { recordContractorRegistryCheck } from "@/features/admin/contractors/actions/record-contractor-registry-check";

export function RegistryCheckForm({
  contractorId,
  inn,
  ogrn,
}: {
  contractorId: string;
  inn: string | null;
  ogrn: string | null;
}) {
  const [source, setSource] = useState("fns_egrul_egrip");
  const [identifierType, setIdentifierType] = useState<"inn" | "ogrn" | "license" | "sro" | "other">(inn ? "inn" : ogrn ? "ogrn" : "other");
  const [identifierValue, setIdentifierValue] = useState(inn ?? ogrn ?? "");
  const [status, setStatus] = useState<"matched" | "mismatch" | "error">("matched");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function onIdentifierTypeChange(value: typeof identifierType) {
    setIdentifierType(value);
    if (value === "inn") setIdentifierValue(inn ?? "");
    else if (value === "ogrn") setIdentifierValue(ogrn ?? "");
    else setIdentifierValue("");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          Источник
          <select className="stroy-select" value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="fns_egrul_egrip">ФНС · ЕГРЮЛ/ЕГРИП</option>
            <option value="fns_transparent_business">ФНС · Прозрачный бизнес</option>
            <option value="sro_registry">Реестр СРО</option>
            <option value="license_registry">Реестр лицензий</option>
            <option value="other">Другой официальный источник</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          Идентификатор
          <select className="stroy-select" value={identifierType} onChange={(event) => onIdentifierTypeChange(event.target.value as typeof identifierType)}>
            <option value="inn">ИНН</option>
            <option value="ogrn">ОГРН / ОГРНИП</option>
            <option value="license">Лицензия</option>
            <option value="sro">СРО</option>
            <option value="other">Другой</option>
          </select>
        </label>
      </div>

      <input
        className="stroy-input"
        value={identifierValue}
        onChange={(event) => setIdentifierValue(event.target.value)}
        placeholder="Значение идентификатора"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ["matched", "Совпадает"],
          ["mismatch", "Есть расхождение"],
          ["error", "Не удалось проверить"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={[
              "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
              status === value ? "border-primary bg-secondary text-primary" : "border-border bg-background text-muted-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        className="stroy-textarea min-h-24"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Комментарий, дата выписки, ссылка/номер документа или найденное расхождение"
      />

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <button
        type="button"
        disabled={isPending || identifierValue.trim().length < 3}
        className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            setMessage("");
            const result = await recordContractorRegistryCheck({
              contractorId,
              source: source as "fns_egrul_egrip" | "fns_transparent_business" | "sro_registry" | "license_registry" | "other",
              identifierType,
              identifierValue,
              status,
              note,
            });
            setMessage(result.message);
            if (result.success) setNote("");
          });
        }}
      >
        {isPending ? "Сохраняем…" : "Сохранить результат проверки"}
      </button>
    </div>
  );
}
