"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export type ContractBuilderState = { success: boolean; message: string } | null;

type ProjectForContract = {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  city: string | null;
  address: string | null;
  property_type: string | null;
  work_type: string | null;
  category_name: string | null;
  selected_contractor_id: string | null;
  selected_bid_id: string | null;
  customer_name: string | null;
  contractor_name: string | null;
  contractor_legal_name: string | null;
  contractor_inn: string | null;
  contractor_ogrn: string | null;
  price: string | number | null;
  duration_days: number | null;
  scope_summary: string | null;
  materials_summary: string | null;
  exclusions: string | null;
  payment_terms: string | null;
  warranty_months: number | null;
  price_includes_materials: boolean | null;
};

const builderSchema = z.object({
  projectId: z.string().uuid("Некорректный проект"),
  contractType: z.enum(["auto", "construction", "contract", "services", "design"]),
  subjectText: z.string().trim().max(5000, "Предмет договора слишком длинный").optional(),
  priceMode: z.enum(["bid", "custom"]),
  customPrice: z.coerce.number().min(0).max(1_000_000_000).optional(),
  paymentMode: z.enum(["bid", "advance_stages", "postpay", "custom"]),
  prepaymentPercent: z.coerce.number().min(0).max(100).optional(),
  paymentText: z.string().trim().max(3000, "Условия оплаты слишком длинные").optional(),
  materialsMode: z.enum(["bid", "customer", "contractor", "mixed"]),
  acceptanceDays: z.coerce.number().int().min(1).max(60),
  warrantyMonths: z.coerce.number().int().min(0).max(120),
  terminationNoticeDays: z.coerce.number().int().min(0).max(90),
  penaltyMode: z.enum(["law", "daily"]),
  penaltyPercent: z.coerce.number().min(0).max(5).optional(),
  customConditions: z.string().trim().max(5000, "Дополнительные условия слишком длинные").optional(),
});

export async function createConfiguredProjectContract(
  _: ContractBuilderState,
  formData: FormData,
): Promise<ContractBuilderState> {
  const parsed = builderSchema.safeParse({
    projectId: String(formData.get("projectId") ?? ""),
    contractType: String(formData.get("contractType") ?? "auto"),
    subjectText: String(formData.get("subjectText") ?? ""),
    priceMode: String(formData.get("priceMode") ?? "bid"),
    customPrice: String(formData.get("customPrice") ?? "") || undefined,
    paymentMode: String(formData.get("paymentMode") ?? "bid"),
    prepaymentPercent: String(formData.get("prepaymentPercent") ?? "") || undefined,
    paymentText: String(formData.get("paymentText") ?? ""),
    materialsMode: String(formData.get("materialsMode") ?? "bid"),
    acceptanceDays: String(formData.get("acceptanceDays") ?? "5"),
    warrantyMonths: String(formData.get("warrantyMonths") ?? "12"),
    terminationNoticeDays: String(formData.get("terminationNoticeDays") ?? "7"),
    penaltyMode: String(formData.get("penaltyMode") ?? "law"),
    penaltyPercent: String(formData.get("penaltyPercent") ?? "") || undefined,
    customConditions: String(formData.get("customConditions") ?? ""),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте параметры договора" };
  }

  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "customer") {
    return { success: false, message: "Составлять договор может только заказчик" };
  }

  const values = parsed.data;
  if (values.priceMode === "custom" && values.customPrice == null) {
    return { success: false, message: "Укажите стоимость договора" };
  }
  if (values.paymentMode === "custom" && !values.paymentText) {
    return { success: false, message: "Опишите индивидуальный порядок оплаты" };
  }
  if (values.paymentMode === "advance_stages" && values.prepaymentPercent == null) {
    return { success: false, message: "Укажите размер аванса" };
  }
  if (values.penaltyMode === "daily" && values.penaltyPercent == null) {
    return { success: false, message: "Укажите размер неустойки" };
  }

  const result = await db.query<ProjectForContract>(
    `SELECT p.id,p.customer_id,p.title,p.description,p.city,p.address,p.property_type,p.work_type,
            sc.name AS category_name,p.selected_contractor_id,p.selected_bid_id,
            concat_ws(' ',pr.last_name,pr.first_name) AS customer_name,
            cc.public_name AS contractor_name,cc.legal_name AS contractor_legal_name,
            cc.inn AS contractor_inn,cc.ogrn AS contractor_ogrn,
            pb.price,pb.duration_days,pb.scope_summary,pb.materials_summary,
            pb.exclusions,pb.payment_terms,pb.warranty_months,pb.price_includes_materials
     FROM public.projects p
     JOIN public.profiles pr ON pr.id=p.customer_id
     LEFT JOIN public.service_categories sc ON sc.id=p.category_id
     LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
     LEFT JOIN public.project_bids pb ON pb.id=p.selected_bid_id
     WHERE p.id=$1::uuid AND p.customer_id=$2::uuid
     LIMIT 1`,
    [values.projectId, auth.user.id],
  );

  const project = result.rows[0];
  if (!project) return { success: false, message: "Проект не найден" };
  if (!project.selected_contractor_id) return { success: false, message: "Сначала выберите подрядчика" };
  if (!project.selected_bid_id) return { success: false, message: "У проекта не найдено принятое предложение подрядчика" };

  const effectiveType = values.contractType === "auto" ? detectType(project) : values.contractType;
  const selectedOptions = {
    includeEstimate: formData.get("includeEstimate") === "on",
    includeSchedule: formData.get("includeSchedule") === "on",
    includeAcceptanceAct: formData.get("includeAcceptanceAct") === "on",
    includeHiddenWorks: formData.get("includeHiddenWorks") === "on",
    includePhotoFixation: formData.get("includePhotoFixation") === "on",
    includeElectronicApprovals: formData.get("includeElectronicApprovals") === "on",
    includeForceMajeure: formData.get("includeForceMajeure") === "on",
    includeConfidentiality: formData.get("includeConfidentiality") === "on",
  };

  const price = values.priceMode === "custom" ? values.customPrice! : numberOrNull(project.price);
  const warrantyMonths = values.warrantyMonths || project.warranty_months || 0;
  const title = buildTitle(project, effectiveType);
  const body = buildBody(project, {
    ...values,
    contractType: effectiveType,
    price,
    warrantyMonths,
    ...selectedOptions,
  });

  const commercialTerms = {
    builderVersion: "ru-builder-1.0",
    governingLaw: "Российская Федерация",
    contractType: effectiveType,
    price,
    acceptedBidPrice: numberOrNull(project.price),
    durationDays: project.duration_days,
    scope: values.subjectText || project.scope_summary || project.description,
    paymentMode: values.paymentMode,
    paymentText: paymentDescription(project, values),
    materialsMode: values.materialsMode,
    acceptanceDays: values.acceptanceDays,
    warrantyMonths,
    terminationNoticeDays: values.terminationNoticeDays,
    penaltyMode: values.penaltyMode,
    penaltyPercent: values.penaltyPercent ?? null,
    customConditions: values.customConditions || null,
    options: selectedOptions,
  };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; current_version: number }>(
      `SELECT id,current_version FROM public.project_contracts WHERE project_id=$1::uuid FOR UPDATE`,
      [project.id],
    );

    let contractId: string;
    let versionNo: number;
    if (existing.rows[0]) {
      contractId = existing.rows[0].id;
      versionNo = Number(existing.rows[0].current_version || 0) + 1;
      await client.query(
        `UPDATE public.project_contracts
         SET source_bid_id=$2::uuid,current_version=$3,status='pending_approval',updated_at=now()
         WHERE id=$1::uuid`,
        [contractId, project.selected_bid_id, versionNo],
      );
    } else {
      const created = await client.query<{ id: string }>(
        `INSERT INTO public.project_contracts(project_id,source_bid_id,customer_id,contractor_id,status,current_version)
         VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'pending_approval',1) RETURNING id`,
        [project.id, project.selected_bid_id, project.customer_id, project.selected_contractor_id],
      );
      const newId = created.rows[0]?.id;
      if (!newId) throw new Error("Не удалось создать договор");
      contractId = newId;
      versionNo = 1;
    }

    await client.query(
      `INSERT INTO public.project_contract_versions(
         contract_id,version_no,title,body,commercial_terms,created_by,legal_template_version
       ) VALUES($1::uuid,$2,$3,$4,$5::jsonb,$6::uuid,$7)`,
      [contractId, versionNo, title, body, JSON.stringify(commercialTerms), auth.user.id, "ru-builder-1.0"],
    );
    await client.query("COMMIT");

    revalidateContractPages(project.id);
    return {
      success: true,
      message: versionNo > 1 ? `Сформирована новая версия договора №${versionNo}` : "Договор составлен. Проверьте текст перед подписанием.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка конструктора договора:", error);
    return { success: false, message: "Не удалось сформировать договор" };
  } finally {
    client.release();
  }
}

type BuildOptions = z.infer<typeof builderSchema> & {
  contractType: "construction" | "contract" | "services" | "design";
  price: number | null;
  warrantyMonths: number;
  includeEstimate: boolean;
  includeSchedule: boolean;
  includeAcceptanceAct: boolean;
  includeHiddenWorks: boolean;
  includePhotoFixation: boolean;
  includeElectronicApprovals: boolean;
  includeForceMajeure: boolean;
  includeConfidentiality: boolean;
};

function buildBody(project: ProjectForContract, o: BuildOptions) {
  const contractorTerm = o.contractType === "services" ? "Исполнитель" : "Подрядчик";
  const place = [project.city, project.address].filter(Boolean).join(", ") || "уточняется сторонами";
  const sections: string[] = [
    buildTitle(project, o.contractType).toUpperCase(),
    "",
    `Заказчик: ${project.customer_name || "заказчик проекта СтройВыбор"}`,
    `${contractorTerm}: ${project.contractor_legal_name || project.contractor_name || "выбранный подрядчик"}`,
    `ИНН ${contractorTerm.toLowerCase()}: ${project.contractor_inn || "уточняется"}`,
    `ОГРН/ОГРНИП: ${project.contractor_ogrn || "уточняется"}`,
    `Объект/место выполнения: ${place}`,
    "",
    "1. ПРЕДМЕТ ДОГОВОРА",
    o.subjectText || project.scope_summary || project.description,
    o.contractType === "services"
      ? "Исполнитель обязуется оказать согласованные услуги, а Заказчик обязуется принять и оплатить их на условиях договора."
      : "Подрядчик обязуется выполнить согласованные работы и передать их результат Заказчику, а Заказчик обязуется принять результат и оплатить его на условиях договора.",
    "",
    "2. ЦЕНА И ПОРЯДОК РАСЧЁТОВ",
    `Цена договора: ${money(o.price)}.`,
    `Порядок оплаты: ${paymentDescription(project, o)}.`,
    "Дополнительные работы и изменение цены подлежат предварительному согласованию сторонами до их выполнения, если иное прямо не следует из обязательных норм закона.",
    "",
    "3. СРОКИ",
    `Ориентировочный срок выполнения: ${project.duration_days ? `${project.duration_days} календарных дней` : "определяется графиком сторон"}.`,
    `При необходимости расторжения по соглашению сторон рекомендуемый срок предварительного уведомления: ${o.terminationNoticeDays} календ. дн. Права сторон на односторонний отказ определяются договором и применимым законодательством РФ.`,
    "",
    "4. МАТЕРИАЛЫ И ОБЕСПЕЧЕНИЕ РАБОТ",
    materialsDescription(project, o.materialsMode),
    project.materials_summary ? `Согласованные материалы: ${project.materials_summary}.` : "",
    project.exclusions ? `Не входит в согласованный объём: ${project.exclusions}.` : "",
    "",
    "5. ПОРЯДОК ВЫПОЛНЕНИЯ И ВЗАИМОДЕЙСТВИЯ",
    "Стороны своевременно передают сведения и документы, необходимые для исполнения договора. Существенные изменения задания, стоимости и сроков фиксируются до выполнения соответствующих работ.",
  ];

  if (o.includePhotoFixation) sections.push("Фотофиксация исходного состояния, хода и результата работ ведётся в рабочем пространстве проекта и может использоваться сторонами как доказательство фактических обстоятельств.");
  if (o.includeHiddenWorks) sections.push("Скрытые работы предъявляются Заказчику до закрытия последующими конструкциями; при необходимости стороны оформляют соответствующий акт.");

  sections.push(
    "",
    "6. СДАЧА И ПРИЁМКА",
    `Заказчик рассматривает предъявленный результат в течение ${o.acceptanceDays} календарных дней и либо подтверждает приёмку, либо направляет конкретный перечень замечаний. Молчание не лишает потребителя прав, предоставленных императивными нормами законодательства.`,
  );
  if (o.includeAcceptanceAct) sections.push("По завершении работ стороны оформляют акт сдачи-приёмки либо иной документ, подтверждающий результат и замечания.");

  sections.push(
    "",
    "7. КАЧЕСТВО И ГАРАНТИЯ",
    `Согласованный гарантийный срок: ${o.warrantyMonths > 0 ? `${o.warrantyMonths} мес.` : "специальный договорный срок не установлен"}.`,
    "Качество результата должно соответствовать договору, обязательным требованиям и обычно предъявляемым требованиям. Договор не уменьшает права заказчика-потребителя, которые не могут быть ограничены соглашением сторон.",
    "",
    "8. ОТВЕТСТВЕННОСТЬ",
    o.penaltyMode === "daily" && o.penaltyPercent != null
      ? `За согласованную сторонами просрочку виновная сторона уплачивает неустойку ${o.penaltyPercent}% от стоимости просроченного обязательства за каждый день просрочки, но только в части, не противоречащей обязательным нормам закона.`
      : "Ответственность сторон определяется законодательством Российской Федерации и условиями настоящего договора.",
    "",
    "9. ИЗМЕНЕНИЕ И РАСТОРЖЕНИЕ",
    "Изменения договора оформляются согласованной сторонами новой версией, дополнительным соглашением либо иным способом, позволяющим достоверно установить содержание и волю сторон. Односторонний отказ допускается в случаях и порядке, предусмотренных законодательством РФ и договором.",
    "",
    "10. СПОРЫ",
    "Стороны стремятся урегулировать разногласия переговорами и письменными претензиями. Условия договора о подсудности применяются только постольку, поскольку они не ограничивают права потребителя и иные императивные требования закона.",
  );

  if (o.includeForceMajeure) sections.push("", "11. ОБСТОЯТЕЛЬСТВА НЕПРЕОДОЛИМОЙ СИЛЫ", "Сторона, для которой исполнение стало невозможным вследствие чрезвычайных и непредотвратимых обстоятельств, уведомляет другую сторону и подтверждает их влияние на исполнение обязательств в соответствии с законодательством РФ.");
  if (o.includeConfidentiality) sections.push("", "12. КОНФИДЕНЦИАЛЬНОСТЬ", "Стороны не раскрывают третьим лицам полученную при исполнении договора непубличную информацию, кроме случаев, когда раскрытие необходимо для исполнения договора, предусмотрено законом или согласовано сторонами.");
  if (o.includeElectronicApprovals) sections.push("", "13. ЭЛЕКТРОННОЕ ВЗАИМОДЕЙСТВИЕ", "Стороны признают действия в аутентифицированных аккаунтах СтройВыбор способом подтверждения согласованных версий документов и условий. Конкретное действие подписания фиксируется вместе с идентификатором аккаунта, временем и техническими доказательствами. Использование электронной фиксации не отменяет требований закона к форме сделки, если для конкретного документа установлена специальная форма.");

  const attachments: string[] = [];
  if (o.includeEstimate) attachments.push("смета/расчёт стоимости");
  if (o.includeSchedule) attachments.push("график выполнения работ");
  if (o.includeAcceptanceAct) attachments.push("форма акта сдачи-приёмки");
  if (o.includeHiddenWorks) attachments.push("форма акта скрытых работ");
  if (attachments.length) sections.push("", "ПРИЛОЖЕНИЯ", `Неотъемлемыми приложениями после согласования являются: ${attachments.join(", ")}.`);

  if (o.customConditions) sections.push("", "ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ", o.customConditions);

  sections.push(
    "",
    "РЕКВИЗИТЫ СТОРОН",
    `Заказчик: ${project.customer_name || "уточняется"}`,
    `${contractorTerm}: ${project.contractor_legal_name || project.contractor_name || "уточняется"}`,
    `ИНН: ${project.contractor_inn || "уточняется"}`,
    `ОГРН/ОГРНИП: ${project.contractor_ogrn || "уточняется"}`,
    "",
    "Перед подписанием стороны обязаны проверить реквизиты, существенные условия и соответствие договора фактическим договорённостям.",
  );

  return sections.filter((x, index, arr) => x !== "" || arr[index - 1] !== "").join("\n");
}

function detectType(project: ProjectForContract): BuildOptions["contractType"] {
  const text = `${project.category_name ?? ""} ${project.work_type ?? ""}`.toLowerCase();
  if (/проектир|дизайн|архитект/.test(text)) return "design";
  if (/клининг|уборк|обслужив|услуг/.test(text)) return "services";
  if (/строит|реконструк|капитал/.test(text)) return "construction";
  return "contract";
}

function buildTitle(project: ProjectForContract, type: BuildOptions["contractType"]) {
  const prefix = type === "services"
    ? "Договор возмездного оказания услуг"
    : type === "design"
      ? "Договор подряда на выполнение проектных работ"
      : type === "construction"
        ? "Договор строительного подряда"
        : "Договор подряда";
  return `${prefix} по проекту «${project.title}»`;
}

function paymentDescription(project: ProjectForContract, values: Pick<BuildOptions, "paymentMode" | "paymentText" | "prepaymentPercent">) {
  if (values.paymentMode === "custom") return values.paymentText || "по индивидуальному графику";
  if (values.paymentMode === "postpay") return "100% после сдачи и приёмки результата";
  if (values.paymentMode === "advance_stages") return `${values.prepaymentPercent ?? 0}% аванс, оставшаяся сумма — по согласованным этапам и факту приёмки`;
  return project.payment_terms || "в соответствии с принятым предложением подрядчика";
}

function materialsDescription(project: ProjectForContract, mode: BuildOptions["materialsMode"]) {
  if (mode === "customer") return "Основные материалы предоставляет Заказчик. Подрядчик обязан своевременно сообщить о выявленной непригодности или недостатках предоставленных материалов.";
  if (mode === "contractor") return "Материалы приобретает Подрядчик и отвечает за их соответствие согласованным характеристикам; стоимость учитывается согласно условиям цены и сметы.";
  if (mode === "mixed") return "Материалы предоставляются обеими сторонами по согласованной спецификации с указанием наименования, количества, стоимости и ответственной стороны.";
  return project.price_includes_materials
    ? "Материалы включены в цену принятого предложения, если сметой или спецификацией не предусмотрено иное."
    : "Материалы оплачиваются отдельно от стоимости работ, если стороны не согласовали иное.";
}

function money(value: number | null) {
  return value == null ? "определяется принятым предложением/сметой" : `${new Intl.NumberFormat("ru-RU").format(value)} руб.`;
}
function numberOrNull(value: string | number | null) {
  if (value == null) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
function revalidateContractPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/contract`);
  revalidatePath(`/contractor/work/${projectId}/contract`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}
