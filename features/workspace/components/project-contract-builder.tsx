"use client";

import { useActionState, useState } from "react";
import { ChevronDown, FilePenLine, Loader2, ShieldCheck } from "lucide-react";

import {
  createConfiguredProjectContract,
  type ContractBuilderState,
} from "@/features/workspace/actions/create-configured-project-contract";

export function ProjectContractBuilder({ projectId, regenerate = false }: { projectId: string; regenerate?: boolean }) {
  const [state, action, pending] = useActionState<ContractBuilderState, FormData>(createConfiguredProjectContract, null);
  const [priceMode, setPriceMode] = useState("bid");
  const [paymentMode, setPaymentMode] = useState("bid");
  const [penaltyMode, setPenaltyMode] = useState("law");

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />

      <BuilderSection title="1. Вид и предмет договора" subtitle="Выберите правовую конструкцию и при необходимости уточните предмет.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Тип договора">
            <select name="contractType" defaultValue="auto" className="stroy-select">
              <option value="auto">Определить автоматически по проекту</option>
              <option value="construction">Строительный подряд</option>
              <option value="contract">Подряд на выполнение работ</option>
              <option value="services">Возмездное оказание услуг</option>
              <option value="design">Проектные работы</option>
            </select>
          </Field>
          <div className="rounded-2xl bg-secondary/50 p-4 text-sm leading-6 text-muted-foreground">
            Автоматический режим использует категорию проекта. Тип можно изменить вручную до формирования версии.
          </div>
        </div>
        <Field label="Предмет договора — необязательно">
          <textarea name="subjectText" rows={4} className="stroy-textarea" placeholder="Если оставить пустым, будет использовано описание и объём работ из принятого предложения." />
        </Field>
      </BuilderSection>

      <BuilderSection title="2. Цена и оплата" subtitle="Можно сохранить цену принятого предложения или задать согласованную сумму и порядок расчётов.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Цена договора">
            <select name="priceMode" value={priceMode} onChange={(e) => setPriceMode(e.target.value)} className="stroy-select">
              <option value="bid">Из принятого предложения</option>
              <option value="custom">Указать другую согласованную сумму</option>
            </select>
          </Field>
          {priceMode === "custom" && <Field label="Сумма, ₽"><input name="customPrice" type="number" min="0" step="1" required className="stroy-input" placeholder="Например, 850000" /></Field>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Порядок оплаты">
            <select name="paymentMode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="stroy-select">
              <option value="bid">Как в принятом предложении</option>
              <option value="advance_stages">Аванс + оплата по этапам</option>
              <option value="postpay">100% после приёмки</option>
              <option value="custom">Индивидуальный график</option>
            </select>
          </Field>
          {paymentMode === "advance_stages" && <Field label="Аванс, %"><input name="prepaymentPercent" type="number" min="0" max="100" step="1" required defaultValue="30" className="stroy-input" /></Field>}
        </div>
        {paymentMode === "custom" && <Field label="Индивидуальный порядок оплаты"><textarea name="paymentText" rows={3} required className="stroy-textarea" placeholder="Например: 20% аванс, 30% после этапа 1, 30% после этапа 2, 20% после итоговой приёмки." /></Field>}
      </BuilderSection>

      <BuilderSection title="3. Материалы, сроки и приёмка" subtitle="Определите, кто закупает материалы, срок проверки результата и гарантию.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Материалы">
            <select name="materialsMode" defaultValue="bid" className="stroy-select">
              <option value="bid">Как в предложении</option>
              <option value="customer">Предоставляет заказчик</option>
              <option value="contractor">Предоставляет подрядчик</option>
              <option value="mixed">Смешанный порядок</option>
            </select>
          </Field>
          <Field label="Срок приёмки, дней"><input name="acceptanceDays" type="number" min="1" max="60" defaultValue="5" className="stroy-input" /></Field>
          <Field label="Гарантия, месяцев"><input name="warrantyMonths" type="number" min="0" max="120" defaultValue="12" className="stroy-input" /></Field>
          <Field label="Уведомление о расторжении, дней"><input name="terminationNoticeDays" type="number" min="0" max="90" defaultValue="7" className="stroy-input" /></Field>
        </div>
      </BuilderSection>

      <BuilderSection title="4. Ответственность" subtitle="По умолчанию применяется ответственность по закону. Договорную неустойку можно добавить отдельно.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Неустойка">
            <select name="penaltyMode" value={penaltyMode} onChange={(e) => setPenaltyMode(e.target.value)} className="stroy-select">
              <option value="law">По законодательству РФ</option>
              <option value="daily">Договорная за каждый день просрочки</option>
            </select>
          </Field>
          {penaltyMode === "daily" && <Field label="Неустойка в день, %"><input name="penaltyPercent" type="number" min="0" max="5" step="0.01" defaultValue="0.1" required className="stroy-input" /></Field>}
        </div>
      </BuilderSection>

      <BuilderSection title="5. Опциональные условия и приложения" subtitle="Включите только те разделы, которые нужны для конкретного объекта.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Option name="includeEstimate" label="Смета / расчёт стоимости" defaultChecked />
          <Option name="includeSchedule" label="График выполнения работ" defaultChecked />
          <Option name="includeAcceptanceAct" label="Акт сдачи-приёмки" defaultChecked />
          <Option name="includeHiddenWorks" label="Акты скрытых работ" />
          <Option name="includePhotoFixation" label="Фотофиксация хода работ" defaultChecked />
          <Option name="includeElectronicApprovals" label="Электронное согласование в СтройВыбор" defaultChecked />
          <Option name="includeForceMajeure" label="Обстоятельства непреодолимой силы" defaultChecked />
          <Option name="includeConfidentiality" label="Конфиденциальность" />
        </div>
        <Field label="Дополнительные условия — необязательно">
          <textarea name="customConditions" rows={5} className="stroy-textarea" placeholder="Например: режим доступа на объект, требования к уборке, вывоз мусора, особый порядок согласования материалов." />
        </Field>
      </BuilderSection>

      <div className="rounded-[1.5rem] border border-primary/20 bg-secondary/35 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">Конструктор формирует проект договора на основе выбранных условий, принятого предложения и данных сторон. Перед электронной подписью стороны должны проверить реквизиты и фактические договорённости; специальные требования закона для конкретного объекта сохраняют силу независимо от текста конструктора.</p>
        </div>
        <button disabled={pending} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Формируем договор...</> : <><FilePenLine className="h-4 w-4" />{regenerate ? "Сформировать новую версию" : "Составить договор по выбранным условиям"}</>}
        </button>
        {state && <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{state.message}</p>}
      </div>
    </form>
  );
}

function BuilderSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <details open className="group rounded-[1.5rem] border border-border bg-background/50 p-5"><summary className="flex cursor-pointer list-none items-start justify-between gap-4"><div><h3 className="font-bold text-foreground">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p></div><ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" /></summary><div className="mt-5 space-y-4">{children}</div></details>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>{children}</label>;
}
function Option({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm font-medium"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]" /><span>{label}</span></label>;
}
