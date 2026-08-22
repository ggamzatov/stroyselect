"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getRequestIp } from "@/lib/security/rate-limit";

const projectSchema = z.string().uuid();

type ContractKind =
  | "construction"
  | "finishing"
  | "engineering"
  | "cleaning"
  | "design"
  | "landscaping"
  | "demolition"
  | "installation";

type ProjectForContract = {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  city: string | null;
  address: string | null;
  property_type: string | null;
  work_type: string | null;
  current_condition: string | null;
  dimensions: string | null;
  material_preferences: string | null;
  permit_readiness: string | null;
  design_readiness: string | null;
  travel_constraints: string | null;
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

export async function createProjectContract(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectSchema.safeParse(projectId).success) return;

  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  const result = await db.query<ProjectForContract>(
    `SELECT p.id,p.customer_id,p.title,p.description,p.city,p.address,p.property_type,
            p.work_type,p.current_condition,p.dimensions,p.material_preferences,
            p.permit_readiness,p.design_readiness,p.travel_constraints,
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
    [projectId, auth.user.id],
  );

  const project = result.rows[0];
  if (!project?.selected_contractor_id || !project.selected_bid_id) return;

  const kind = classifyContract(project.category_name, project.work_type);
  const templateVersion = `ru-2.0-${kind}`;
  const title = contractTitle(project, kind);
  const body = buildContractBody(project, kind);
  const commercialTerms = {
    price: numberOrNull(project.price),
    durationDays: project.duration_days,
    scope: project.scope_summary,
    materials: project.materials_summary,
    exclusions: project.exclusions,
    paymentTerms: project.payment_terms,
    warrantyMonths: project.warranty_months,
    priceIncludesMaterials: project.price_includes_materials,
    category: project.category_name,
    contractKind: kind,
    governingLaw: "Russian Federation",
    template: templateVersion,
  };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; current_version: number }>(
      `SELECT id,current_version
       FROM public.project_contracts
       WHERE project_id=$1::uuid
       FOR UPDATE`,
      [projectId],
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
        `INSERT INTO public.project_contracts(
           project_id,source_bid_id,customer_id,contractor_id,status,current_version
         ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'pending_approval',1)
         RETURNING id`,
        [projectId, project.selected_bid_id, project.customer_id, project.selected_contractor_id],
      );
      const newId = created.rows[0]?.id;
      if (!newId) throw new Error("Contract was not created");
      contractId = newId;
      versionNo = 1;
    }

    await client.query(
      `INSERT INTO public.project_contract_versions(
         contract_id,version_no,title,body,commercial_terms,created_by,legal_template_version
       ) VALUES($1::uuid,$2,$3,$4,$5::jsonb,$6::uuid,$7)`,
      [contractId, versionNo, title, body, JSON.stringify(commercialTerms), auth.user.id, templateVersion],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания договора:", error);
  } finally {
    client.release();
  }

  revalidateContractPages(projectId);
}

export async function approveProjectContract(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const signatureAgreement = String(formData.get("electronicSignatureAgreement") ?? "");
  if (!projectSchema.safeParse(projectId).success || signatureAgreement !== "accepted") return;

  const auth = await requireActiveUser();
  if (!auth.success) return;

  const access = await db.query<{
    contract_id: string;
    version_no: number;
    customer_id: string;
    contractor_owner_id: string | null;
  }>(
    `SELECT pc.id AS contract_id,pc.current_version AS version_no,pc.customer_id,
            cc.owner_id AS contractor_owner_id
     FROM public.project_contracts pc
     JOIN public.contractor_companies cc ON cc.id=pc.contractor_id
     WHERE pc.project_id=$1::uuid
     LIMIT 1`,
    [projectId],
  );

  const row = access.rows[0];
  if (!row) return;
  const isCustomer = row.customer_id === auth.user.id;
  const isContractor = row.contractor_owner_id === auth.user.id;
  if (!isCustomer && !isContractor) return;

  const h = await headers();
  const evidence = JSON.stringify({
    method: "authenticated_account_simple_electronic_signature",
    userId: auth.user.id,
    ip: await getRequestIp(),
    userAgent: h.get("user-agent"),
    acceptedAt: new Date().toISOString(),
    contractVersion: row.version_no,
    statement: "I confirm this contract version and agree to use my authenticated account action as a simple electronic signature under the parties' agreement.",
  });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (isCustomer) {
      await client.query(
        `UPDATE public.project_contract_versions
         SET customer_approved_at=COALESCE(customer_approved_at,now()),
             customer_approval_evidence=COALESCE(customer_approval_evidence,$3::jsonb)
         WHERE contract_id=$1::uuid AND version_no=$2`,
        [row.contract_id, row.version_no, evidence],
      );
    } else {
      await client.query(
        `UPDATE public.project_contract_versions
         SET contractor_approved_at=COALESCE(contractor_approved_at,now()),
             contractor_approval_evidence=COALESCE(contractor_approval_evidence,$3::jsonb)
         WHERE contract_id=$1::uuid AND version_no=$2`,
        [row.contract_id, row.version_no, evidence],
      );
    }

    await client.query(
      `UPDATE public.project_contracts pc
       SET status=CASE WHEN EXISTS(
         SELECT 1 FROM public.project_contract_versions v
         WHERE v.contract_id=pc.id AND v.version_no=pc.current_version
           AND v.customer_approved_at IS NOT NULL
           AND v.contractor_approved_at IS NOT NULL
       ) THEN 'active' ELSE 'pending_approval' END,
       updated_at=now()
       WHERE pc.id=$1::uuid`,
      [row.contract_id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка согласования договора:", error);
  } finally {
    client.release();
  }
  revalidateContractPages(projectId);
}

function classifyContract(category: string | null, workType: string | null): ContractKind {
  const text = `${category ?? ""} ${workType ?? ""}`.toLowerCase();
  if (/клининг|уборк|мойк/.test(text)) return "cleaning";
  if (/проектир|дизайн|архитект/.test(text)) return "design";
  if (/демонтаж|снос|разбор/.test(text)) return "demolition";
  if (/благоустр|озелен|ландшафт|газон|дренаж/.test(text)) return "landscaping";
  if (/электр|сантех|отоплен|вентиляц|кондицион|инженер/.test(text)) return "engineering";
  if (/монтаж|установк|сборк/.test(text)) return "installation";
  if (/отдел|ремонт|штукатур|маляр|плитк|стяжк/.test(text)) return "finishing";
  return "construction";
}

function contractTitle(project: ProjectForContract, kind: ContractKind) {
  const prefix = kind === "cleaning"
    ? "Договор возмездного оказания услуг"
    : kind === "design"
      ? "Договор подряда на выполнение проектных работ"
      : "Договор подряда";
  return `${prefix} по проекту «${project.title}»`;
}

function buildContractBody(project: ProjectForContract, kind: ContractKind) {
  const price = project.price == null
    ? "определяется согласованным предложением"
    : `${new Intl.NumberFormat("ru-RU").format(Number(project.price))} руб.`;
  const object = [project.city, project.address].filter(Boolean).join(", ") || "адрес уточняется сторонами";
  const partyTerm = kind === "cleaning" ? "Исполнитель" : "Подрядчик";

  const sections = [
    contractTitle(project, kind).toUpperCase(),
    `Категория: ${project.category_name || "работы/услуги по проекту"}`,
    `Проект: ${project.title}`,
    `Заказчик: ${project.customer_name || "пользователь-заказчик СтройВыбор"}`,
    `${partyTerm}: ${project.contractor_legal_name || project.contractor_name || "выбранный исполнитель"}`,
    `ИНН: ${project.contractor_inn || "уточняется"}`,
    `ОГРН/ОГРНИП: ${project.contractor_ogrn || "уточняется"}`,
    `Место выполнения: ${object}`,
    "",
    "1. ПРЕДМЕТ ДОГОВОРА",
    project.scope_summary || project.description,
    kind === "cleaning"
      ? "Исполнитель обязуется оказать согласованные услуги, а Заказчик — обеспечить необходимые условия, принять услуги и оплатить их."
      : "Подрядчик обязуется выполнить согласованный объём работ и передать результат Заказчику, а Заказчик — создать необходимые условия, принять результат и оплатить его.",
    "",
    "2. ЦЕНА И РАСЧЁТЫ",
    `Цена договора: ${price}.`,
    `Порядок оплаты: ${project.payment_terms || "по согласованному сторонами графику"}.`,
    `Материалы в цене: ${project.price_includes_materials ? "включены, если сметой не предусмотрено иное" : "оплачиваются отдельно, если сметой не предусмотрено иное"}.`,
    "Изменение цены и дополнительные работы оформляются до их выполнения отдельным согласованием сторон.",
    "",
    "3. СРОКИ",
    `Плановый срок: ${project.duration_days ? `${project.duration_days} календарных дней` : "согласуется сторонами"}.`,
    "Изменения сроков фиксируются сторонами в рабочем пространстве проекта или отдельном соглашении.",
    ...serviceSpecificSections(project, kind),
    "",
    "8. СДАЧА И ПРИЁМКА",
    "Результат работ или оказанные услуги предъявляются Заказчику. Недостатки и замечания фиксируются конкретно. Когда характер отношений предполагает акт, стороны оформляют акт сдачи-приёмки. Электронная фиксация не ограничивает права потребителя, предоставленные законом.",
    "",
    "9. КАЧЕСТВО И ГАРАНТИЯ",
    `Дополнительный согласованный гарантийный срок: ${warrantyLabel(project.warranty_months)}.`,
    "Качество должно соответствовать договору, заданию, обязательным требованиям и обычно предъявляемым требованиям. Условия договора не уменьшают обязательные права потребителя.",
    "",
    "10. ОТВЕТСТВЕННОСТЬ И СПОРЫ",
    "Стороны несут ответственность в соответствии с законодательством Российской Федерации. Условия о претензионном порядке и подсудности применяются только в той мере, в которой они не ограничивают императивные права потребителя.",
    "",
    "11. ЭЛЕКТРОННОЕ ВЗАИМОДЕЙСТВИЕ",
    "Стороны признают согласованные документы и действия в СтройВыбор электронным способом взаимодействия. Действие в аутентифицированном аккаунте может использоваться как простая электронная подпись при соблюдении соглашения сторон о порядке её использования. Система фиксирует пользователя, версию документа, дату и технические доказательства подтверждения.",
    "",
    "12. ПЕРСОНАЛЬНЫЕ ДАННЫЕ",
    "Персональные данные обрабатываются на самостоятельных законных основаниях в соответствии с политикой оператора. Согласие на обработку персональных данных оформляется отдельно, когда именно согласие является основанием обработки, и не включается автоматически в настоящий договор.",
    "",
    "13. ПРИЛОЖЕНИЯ И ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ",
    "Неотъемлемыми частями договора являются принятое предложение/смета, техническое задание, график платежей и этапов, акты, замечания и согласованные изменения. При противоречии императивной норме законодательства РФ применяется закон.",
  ];

  return sections.join("\n");
}

function serviceSpecificSections(project: ProjectForContract, kind: ContractKind): string[] {
  switch (kind) {
    case "cleaning":
      return [
        "",
        "4. УСЛОВИЯ ОКАЗАНИЯ КЛИНИНГОВЫХ УСЛУГ",
        `Состояние объекта: ${project.current_condition || "согласно заявке"}. Объём: ${project.dimensions || "согласно заявке"}.`,
        "Заказчик сообщает о поверхностях и имуществе, требующих специального ухода, и обеспечивает согласованный доступ к объекту, воде и электроэнергии, если это необходимо.",
        "",
        "5. ИНВЕНТАРЬ, ХИМИЯ И ИМУЩЕСТВО",
        "Исполнитель использует средства и оборудование по назначению и проявляет разумную осмотрительность при обращении с имуществом Заказчика. Спорные повреждения рекомендуется фиксировать до начала услуг.",
        "",
        "6. КРИТЕРИИ РЕЗУЛЬТАТА",
        "Критерии результата определяются выбранным видом уборки и заданием. Услуги вне согласованного объёма выполняются только после отдельного согласования.",
        "",
        "7. БЕЗОПАСНОСТЬ",
        "Исполнитель соблюдает требования безопасного применения химических средств и оборудования; Заказчик сообщает об известных опасностях и ограничениях объекта.",
      ];
    case "design":
      return [
        "",
        "4. ТЕХНИЧЕСКОЕ ЗАДАНИЕ И ИСХОДНЫЕ ДАННЫЕ",
        `Стадия объекта: ${project.current_condition || "уточняется"}. Параметры: ${project.dimensions || "согласно заданию"}.`,
        "Заказчик предоставляет достоверные исходные данные. Их изменение после начала проектирования влияет на цену или срок только после согласования сторон.",
        "",
        "5. СОСТАВ ПРОЕКТНОГО РЕЗУЛЬТАТА",
        "Состав документации, количество концепций, правок, визуализаций и чертежей определяется техническим заданием и принятым предложением.",
        "",
        "6. ПРАВА НА РЕЗУЛЬТАТ",
        "Передача исключительных прав или предоставление права использования результатов интеллектуальной деятельности осуществляется только в объёме, прямо предусмотренном договором или приложением.",
        "",
        "7. СОГЛАСОВАНИЯ",
        "Если результат требует обязательных согласований, обязанности по их получению и оплате определяются техническим заданием или приложением.",
      ];
    case "demolition":
      return [
        "",
        "4. ДОПУСКИ, ОТКЛЮЧЕНИЯ И БЕЗОПАСНОСТЬ",
        `Готовность разрешений: ${project.permit_readiness || "уточняется"}.`,
        "До начала демонтажа определяются необходимые разрешения, обследования, отключение сетей и ограждение зоны работ. При очевидной угрозе жизни или имуществу работы не начинаются до устранения риска.",
        "",
        "5. ОТХОДЫ",
        "Сортировка, погрузка, вывоз и передача строительных отходов выполняются в согласованном объёме и с соблюдением применимых требований законодательства.",
        "",
        "6. СОХРАНЯЕМЫЕ ЭЛЕМЕНТЫ",
        "Конструкции и имущество, которые необходимо сохранить, перечисляются до начала демонтажа.",
        "",
        "7. ДОСТУП ТЕХНИКИ",
        project.travel_constraints || "Условия подъезда, размещения техники и ограничения определяются заданием и условиями объекта.",
      ];
    case "engineering":
      return [
        "",
        "4. ОБОРУДОВАНИЕ И ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ",
        project.materials_summary || project.material_preferences || "Перечень оборудования и материалов определяется сметой и спецификацией.",
        `Проект/схема: ${project.design_readiness || "уточняется"}.`,
        "",
        "5. СКРЫТЫЕ РАБОТЫ И ИСПЫТАНИЯ",
        "Скрываемые участки предъявляются до закрытия, когда это требуется характером работ. Испытания, измерения и пусконаладка выполняются в объёме задания и обязательных требований.",
        "",
        "6. ПУСКОНАЛАДКА И ДОКУМЕНТЫ",
        "Если входит в объём, Подрядчик передаёт результаты измерений, настройки, инструкции, паспорта и иные согласованные документы.",
        "",
        "7. ДОСТУП",
        project.travel_constraints || "Заказчик обеспечивает согласованный доступ к помещениям, сетям и точкам подключения.",
      ];
    case "landscaping":
      return [
        "",
        "4. УЧАСТОК И ИСХОДНЫЕ УСЛОВИЯ",
        `Состояние участка: ${project.current_condition || "согласно заявке"}. Параметры: ${project.dimensions || "согласно заявке"}.`,
        "",
        "5. МАТЕРИАЛЫ И РАСТЕНИЯ",
        project.materials_summary || project.material_preferences || "Номенклатура материалов и посадочного материала определяется спецификацией.",
        "",
        "6. СЕЗОННОСТЬ И УХОД",
        "Сроки посадки и гарантийные обязательства учитывают сезонность. Условия гарантии на растения учитывают соблюдение согласованного режима полива и ухода.",
        "",
        "7. ДОСТУП ТЕХНИКИ",
        project.travel_constraints || "Заказчик обеспечивает согласованный подъезд техники и доступ к участку.",
      ];
    case "installation":
      return [
        "",
        "4. ИЗДЕЛИЯ И КОМПЛЕКТАЦИЯ",
        project.materials_summary || project.material_preferences || "Комплектация определяется предложением и спецификацией.",
        "",
        "5. МОНТАЖ И НАСТРОЙКА",
        "Состав монтажных, крепёжных, подключочных и настроечных операций определяется заданием. Дополнительная подготовка основания или коммуникаций выполняется после согласования.",
        "",
        "6. ПРИЁМКА",
        "При приёмке проверяются комплектность, внешний вид, работоспособность и иные согласованные критерии результата.",
        "",
        "7. ДОСТУП",
        project.travel_constraints || "Заказчик обеспечивает доступ к месту монтажа и условия для согласованной разгрузки/установки.",
      ];
    case "finishing":
    case "construction":
    default:
      return [
        "",
        "4. МАТЕРИАЛЫ, ОБОРУДОВАНИЕ И СМЕТА",
        project.materials_summary || project.material_preferences || "Материалы и оборудование определяются сметой и спецификацией.",
        `Исключения: ${project.exclusions || "не заявлены, кроме прямо следующих из сметы и приложений"}.`,
        "Замена материала или решения, влияющая на цену, качество или внешний вид, требует согласования Заказчика.",
        "",
        "5. ПОДГОТОВКА ОБЪЕКТА И ДОКУМЕНТАЦИЯ",
        `Состояние объекта: ${project.current_condition || "согласно заявке"}.`,
        `Проектная документация: ${project.design_readiness || "не требуется либо уточняется"}. Разрешения: ${project.permit_readiness || "не требуется либо уточняется"}.`,
        "",
        "6. ЭТАПЫ, СКРЫТЫЕ РАБОТЫ И ИЗМЕНЕНИЯ",
        "Скрытые работы предъявляются до закрытия, когда это предусмотрено характером работ. Отклонения от задания и дополнительные работы фиксируются до выполнения.",
        "",
        "7. СОХРАННОСТЬ И БЕЗОПАСНОСТЬ",
        "Стороны определяют зоны работ и порядок хранения материалов. Подрядчик соблюдает обязательные требования безопасности, применимые к выполняемым работам.",
      ];
  }
}

function warrantyLabel(months: number | null) {
  if (months == null || months === 0) return "не установлен сверх обязательных требований закона";
  return `${months} мес.`;
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function revalidateContractPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/contract`);
  revalidatePath(`/contractor/work/${projectId}/contract`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}
