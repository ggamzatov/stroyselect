"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getRequestIp } from "@/lib/security/rate-limit";

const projectSchema = z.string().uuid();
type ContractKind = "construction"|"finishing"|"engineering"|"cleaning"|"design"|"landscaping"|"demolition"|"installation";
type ProjectForContract = {
  id:string; customer_id:string; title:string; description:string; city:string|null; address:string|null;
  property_type:string|null; work_type:string|null; current_condition:string|null; dimensions:string|null;
  material_preferences:string|null; permit_readiness:string|null; design_readiness:string|null; travel_constraints:string|null;
  category_name:string|null; selected_contractor_id:string|null; selected_bid_id:string|null; customer_name:string|null;
  contractor_name:string|null; contractor_legal_name:string|null; contractor_inn:string|null; contractor_ogrn:string|null;
  price:string|number|null; duration_days:number|null; scope_summary:string|null; materials_summary:string|null;
  exclusions:string|null; payment_terms:string|null; warranty_months:number|null; price_includes_materials:boolean|null;
};

export async function createProjectContract(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectSchema.safeParse(projectId).success) return;
  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  const result = await db.query<ProjectForContract>(`
    SELECT p.id,p.customer_id,p.title,p.description,p.city,p.address,p.property_type,p.work_type,p.current_condition,p.dimensions,
           p.material_preferences,p.permit_readiness,p.design_readiness,p.travel_constraints,sc.name AS category_name,
           p.selected_contractor_id,p.selected_bid_id,concat_ws(' ',pr.last_name,pr.first_name) customer_name,
           cc.public_name contractor_name,cc.legal_name contractor_legal_name,cc.inn contractor_inn,cc.ogrn contractor_ogrn,
           pb.price,pb.duration_days,pb.scope_summary,pb.materials_summary,pb.exclusions,pb.payment_terms,pb.warranty_months,pb.price_includes_materials
    FROM public.projects p
    JOIN public.profiles pr ON pr.id=p.customer_id
    LEFT JOIN public.service_categories sc ON sc.id=p.category_id
    LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
    LEFT JOIN public.project_bids pb ON pb.id=p.selected_bid_id
    WHERE p.id=$1::uuid AND p.customer_id=$2::uuid LIMIT 1`, [projectId, auth.user.id]);
  const project = result.rows[0];
  if (!project?.selected_contractor_id || !project.selected_bid_id) return;

  const kind = classifyContract(project.category_name, project.work_type);
  const templateVersion = `ru-2.0-${kind}`;
  const body = buildContractBody(project, kind);
  const title = buildContractTitle(project, kind);
  const terms = {
    price:numberOrNull(project.price), durationDays:project.duration_days, scope:project.scope_summary,
    materials:project.materials_summary, exclusions:project.exclusions, paymentTerms:project.payment_terms,
    warrantyMonths:project.warranty_months, priceIncludesMaterials:project.price_includes_materials,
    category:project.category_name, contractKind:kind, governingLaw:"Russian Federation", template:templateVersion,
  };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{id:string;current_version:number}>(`SELECT id,current_version FROM public.project_contracts WHERE project_id=$1::uuid FOR UPDATE`, [projectId]);
    let contractId:string;
    let versionNo:number;
    if (existing.rows[0]) {
      contractId = existing.rows[0].id;
      versionNo = Number(existing.rows[0].current_version || 0) + 1;
      await client.query(`UPDATE public.project_contracts SET source_bid_id=$2::uuid,current_version=$3,status='pending_approval',updated_at=now() WHERE id=$1::uuid`, [contractId, project.selected_bid_id, versionNo]);
    } else {
      const created = await client.query<{id:string}>(`INSERT INTO public.project_contracts(project_id,source_bid_id,customer_id,contractor_id,status,current_version) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'pending_approval',1) RETURNING id`, [projectId,project.selected_bid_id,project.customer_id,project.selected_contractor_id]);
      contractId = created.rows[0]?.id;
      versionNo = 1;
      if (!contractId) throw new Error("Contract was not created");
    }
    await client.query(`INSERT INTO public.project_contract_versions(contract_id,version_no,title,body,commercial_terms,created_by,legal_template_version) VALUES($1::uuid,$2,$3,$4,$5::jsonb,$6::uuid,$7)`, [contractId,versionNo,title,body,JSON.stringify(terms),auth.user.id,templateVersion]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания договора:", error);
  } finally { client.release(); }
  revalidateContractPages(projectId);
}

export async function approveProjectContract(formData: FormData) {
  const projectId=String(formData.get("projectId")??"");
  const signatureAgreement=String(formData.get("electronicSignatureAgreement")??"");
  if(!projectSchema.safeParse(projectId).success||signatureAgreement!=="accepted")return;
  const auth=await requireActiveUser();if(!auth.success)return;
  const access=await db.query<{contract_id:string;version_no:number;customer_id:string;contractor_owner_id:string|null}>(`SELECT pc.id contract_id,pc.current_version version_no,pc.customer_id,cc.owner_id contractor_owner_id FROM public.project_contracts pc JOIN public.contractor_companies cc ON cc.id=pc.contractor_id WHERE pc.project_id=$1::uuid LIMIT 1`,[projectId]);
  const row=access.rows[0];if(!row)return;
  const isCustomer=row.customer_id===auth.user.id;const isContractor=row.contractor_owner_id===auth.user.id;if(!isCustomer&&!isContractor)return;
  const h=await headers();
  const evidence=JSON.stringify({method:"authenticated_account_simple_electronic_signature",userId:auth.user.id,ip:await getRequestIp(),userAgent:h.get("user-agent"),acceptedAt:new Date().toISOString(),contractVersion:row.version_no,statement:"I confirm this contract version and agree to use my authenticated account action as a simple electronic signature under the parties' agreement."});
  const client=await db.connect();
  try{await client.query("BEGIN");if(isCustomer)await client.query(`UPDATE public.project_contract_versions SET customer_approved_at=COALESCE(customer_approved_at,now()),customer_approval_evidence=COALESCE(customer_approval_evidence,$3::jsonb) WHERE contract_id=$1::uuid AND version_no=$2`,[row.contract_id,row.version_no,evidence]);else await client.query(`UPDATE public.project_contract_versions SET contractor_approved_at=COALESCE(contractor_approved_at,now()),contractor_approval_evidence=COALESCE(contractor_approval_evidence,$3::jsonb) WHERE contract_id=$1::uuid AND version_no=$2`,[row.contract_id,row.version_no,evidence]);await client.query(`UPDATE public.project_contracts pc SET status=CASE WHEN EXISTS(SELECT 1 FROM public.project_contract_versions v WHERE v.contract_id=pc.id AND v.version_no=pc.current_version AND v.customer_approved_at IS NOT NULL AND v.contractor_approved_at IS NOT NULL) THEN 'active' ELSE 'pending_approval' END,updated_at=now() WHERE pc.id=$1::uuid`,[row.contract_id]);await client.query("COMMIT")}catch(error){await client.query("ROLLBACK");console.error("Ошибка согласования договора:",error)}finally{client.release()}revalidateContractPages(projectId);
}

function classifyContract(category:string|null, workType:string|null):ContractKind {
  const text=`${category??""} ${workType??""}`.toLowerCase();
  if(/клининг|уборк|мойк/.test(text)) return "cleaning";
  if(/проектир|дизайн|архитект/.test(text)) return "design";
  if(/демонтаж|снос|разбор/.test(text)) return "demolition";
  if(/благоустр|озелен|ландшафт|газон|дренаж/.test(text)) return "landscaping";
  if(/электр|сантех|отоплен|вентиляц|кондицион|инженер/.test(text)) return "engineering";
  if(/монтаж|установк|сборк/.test(text)) return "installation";
  if(/отдел|ремонт|штукатур|маляр|плитк|стяжк/.test(text)) return "finishing";
  return "construction";
}

function buildContractTitle(p:ProjectForContract, kind:ContractKind) {
  const prefix = kind === "cleaning" ? "Договор возмездного оказания услуг" : kind === "design" ? "Договор подряда на проектные работы" : "Договор подряда";
  return `${prefix} по проекту «${p.title}»`;
}

function buildContractBody(p:ProjectForContract, kind:ContractKind) {
  const price=p.price==null?"определяется согласованным предложением":`${new Intl.NumberFormat("ru-RU").format(Number(p.price))} руб.`;
  const object=[p.city,p.address].filter(Boolean).join(", ")||"адрес уточняется сторонами";
  const common=[
    buildContractTitle(p,kind).toUpperCase(),
    `Категория: ${p.category_name||"услуги/работы по проекту"}`,
    `Проект: ${p.title}`,
    `Заказчик: ${p.customer_name||"пользователь-заказчик СтройВыбор"}`,
    `Исполнитель/Подрядчик: ${p.contractor_legal_name||p.contractor_name||"выбранный подрядчик"}`,
    `ИНН: ${p.contractor_inn||"уточняется"}`,
    `ОГРН/ОГРНИП: ${p.contractor_ogrn||"уточняется"}`,
    `Место выполнения: ${object}`,
    "",
    "1. ПРЕДМЕТ ДОГОВОРА",
    p.scope_summary||p.description,
    kind==="cleaning"?"Исполнитель обязуется оказать согласованные услуги по уборке, а Заказчик — обеспечить доступ, принять оказанные услуги и оплатить их.":"Подрядчик обязуется выполнить согласованный объём работ и передать результат Заказчику, а Заказчик — создать необходимые условия, принять результат и оплатить его.",
    "",
    "2. ЦЕНА, СОСТАВ ЦЕНЫ И РАСЧЁТЫ",
    `Цена договора: ${price}`,
    `Порядок оплаты: ${p.payment_terms||"по согласованному сторонами графику"}.`,
    `Материалы в цене: ${p.price_includes_materials?"включены, если иное прямо не указано в смете":"не включены, если иное прямо не указано в смете"}.`,
    "Стоимость меняется только по соглашению сторон. Дополнительные работы и расходы до их выполнения оформляются отдельным согласованным изменением к договору.",
    "",
    "3. СРОКИ И ПОРЯДОК ВЫПОЛНЕНИЯ",
    `Плановый срок: ${p.duration_days?`${p.duration_days} календарных дней`:"согласуется сторонами"}.`,
    "Начало, этапы, переносы и объективные препятствия фиксируются в рабочем пространстве проекта. Одностороннее изменение срока допускается только в случаях, предусмотренных законом или договором.",
    ...specialTerms(p,kind),
    "",
    "8. СДАЧА, ПРИЁМКА И ЗАМЕЧАНИЯ",
    "Результат либо оказанные услуги предъявляются Заказчику. При наличии недостатков Заказчик фиксирует конкретные замечания. По работам, для которых применим акт, стороны формируют акт сдачи-приёмки. Отсутствие записи в сервисе не ограничивает права, которые предоставлены потребителю законом.",
    "",
    "9. КАЧЕСТВО, ГАРАНТИЯ И УСТРАНЕНИЕ НЕДОСТАТКОВ",
    `Согласованный дополнительный гарантийный срок: ${p.warranty_months==null?"не установлен":p.warranty_months===0?"не установлен сверх обязательных требований закона":`${p.warranty_months} мес.`}.`,
    "Качество результата должно соответствовать договору, техническому заданию, обязательным требованиям и обычно предъявляемым требованиям. Условия договора не уменьшают обязательные права потребителя.",
    "",
    "10. ОТВЕТСТВЕННОСТЬ, ФОРС-МАЖОР И СПОРЫ",
    "Стороны отвечают за нарушение обязательств в соответствии с договором и законодательством Российской Федерации. Обстоятельства непреодолимой силы подтверждаются и учитываются в объёме, предусмотренном законом. Условия о подсудности и претензионном порядке не ограничивают права потребителя, если такие права установлены императивными нормами.",
    "",
    "11. ЭЛЕКТРОННОЕ ВЗАИМОДЕЙСТВИЕ И ПРОСТАЯ ЭЛЕКТРОННАЯ ПОДПИСЬ",
    "Стороны признают согласованные документы и действия в СтройВыбор электронным способом взаимодействия. Действие в аутентифицированном аккаунте используется как простая электронная подпись при соблюдении соглашения сторон о порядке её использования; каждая сторона обязана обеспечивать конфиденциальность данных доступа. Система фиксирует пользователя, версию документа, дату и технические доказательства подтверждения.",
    "",
    "12. ПЕРСОНАЛЬНЫЕ ДАННЫЕ",
    "Персональные данные обрабатываются на самостоятельных законных основаниях в соответствии с политикой оператора. Согласие на обработку персональных данных оформляется отдельно в случаях, когда именно согласие является основанием обработки, и не включается автоматически в текст настоящего договора.",
    "",
    "13. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ И ПРИЛОЖЕНИЯ",
    "Неотъемлемыми частями договора являются принятое предложение/смета, техническое задание, график платежей и этапов, акты, документы по замечаниям и согласованные изменения. При противоречии условия договора императивной норме законодательства РФ применяется соответствующая норма закона.",
  ];
  return common.join("\n");
}

function specialTerms(p:ProjectForContract,kind:ContractKind):string[] {
  if(kind==="cleaning") return ["","4. УСЛОВИЯ ОКАЗАНИЯ КЛИНИНГОВЫХ УСЛУГ",`Объект/состояние: ${p.current_condition||"согласно заявке"}. Площадь и объём: ${p.dimensions||"согласно заявке"}.`,`Инвентарь и химические средства определяются предложением сторон. Заказчик сообщает о покрытиях, предметах и материалах, требующих специального ухода, а также обеспечивает доступ к воде/электроэнергии, если это необходимо.`,`5. ИМУЩЕСТВО ЗАКАЗЧИКА","Исполнитель обязан проявлять разумную осмотрительность при обращении с имуществом Заказчика. Обнаруженные повреждения и спорные состояния рекомендуется фиксировать до начала услуг.","","6. РЕЗУЛЬТАТ УСЛУГ","Критерии результата определяются заданием и выбранным видом уборки. Услуги, не включённые в согласованный объём, выполняются только после отдельного согласования.","","7. БЕЗОПАСНОСТЬ","Исполнитель соблюдает требования к безопасному применению химических средств и оборудования, а Заказчик сообщает об известных опасностях на объекте."];
  if(kind==="design") return ["","4. ТЕХНИЧЕСКОЕ ЗАДАНИЕ И ИСХОДНЫЕ ДАННЫЕ",`Исходная стадия объекта: ${p.current_condition||"уточняется"}. Параметры: ${p.dimensions||"согласно заданию"}.`,`Заказчик предоставляет достоверные исходные данные, необходимые для проектирования. Изменение исходных данных после начала работ может повлечь изменение цены и срока только после согласования сторон.`,"","5. СОСТАВ ПРОЕКТНОГО РЕЗУЛЬТАТА","Состав документации определяется принятым предложением и техническим заданием. Количество концепций, правок, визуализаций, чертежей и иных материалов считается согласованным только при прямом указании в задании.","","6. ПРАВА НА РЕЗУЛЬТАТ","Передача исключительных прав либо предоставление права использования результатов интеллектуальной деятельности осуществляется только в объёме, прямо указанном в договоре или приложении. Личные неимущественные права автора сохраняются в случаях, предусмотренных законом.","","7. СОГЛАСОВАНИЯ","Если результат требует государственных, муниципальных или иных обязательных согласований, распределение обязанностей по их получению должно быть прямо определено заданием."];
  if(kind==="demolition") return ["","4. ДОПУСКИ, ОТКЛЮЧЕНИЯ И БЕЗОПАСНОСТЬ",`Готовность разрешений: ${p.permit_readiness||"уточняется сторонами"}.`,`До начала демонтажа стороны определяют необходимость разрешений, обследований, отключения инженерных сетей и ограждения зоны работ. Подрядчик не начинает работы при наличии очевидной угрозы жизни, имуществу или соседним объектам.","","5. СТРОИТЕЛЬНЫЕ ОТХОДЫ","Порядок сортировки, погрузки, вывоза и передачи отходов определяется сметой и требованиями законодательства. Если вывоз включён в предложение, Подрядчик обеспечивает его в согласованном объёме.","","6. СОХРАНЯЕМЫЕ ЭЛЕМЕНТЫ","Конструкции и имущество, подлежащие сохранению, должны быть перечислены до начала работ. Неясности фиксируются до демонтажа.","","7. ДОСТУП ТЕХНИКИ",p.travel_constraints||"Требования к подъезду и размещению техники определяются на объекте и в задании."];
  if(kind==="engineering") return ["","4. ОБОРУДОВАНИЕ И ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ",p.materials_summary||p.material_preferences||"Перечень оборудования и материалов определяется сметой и спецификацией.",`Наличие проекта/схем: ${p.design_readiness||"уточняется"}. Монтаж выполняется с соблюдением обязательных требований, применимых к конкретной инженерной системе.`,"","5. СКРЫТЫЕ РАБОТЫ И ИСПЫТАНИЯ","Скрываемые участки предъявляются до их закрытия, когда это требуется характером работ. Испытания, измерения и пусконаладка выполняются в объёме, предусмотренном заданием и обязательными требованиями.","","6. ПУСКОНАЛАДКА И ДОКУМЕНТАЦИЯ","Если входит в объём, Подрядчик передаёт результаты измерений, настройки, инструкции, паспорта и иные документы на установленное оборудование.","","7. ДОСТУП И ИСХОДНЫЕ УСЛОВИЯ",p.travel_constraints||"Заказчик обеспечивает согласованный доступ к помещениям, сетям и точкам подключения."];
  if(kind==="landscaping") return ["","4. УЧАСТОК, РЕЛЬЕФ И ИСХОДНЫЕ УСЛОВИЯ",`Состояние участка: ${p.current_condition||"согласно заявке"}. Параметры: ${p.dimensions||"согласно заявке"}.`,`Подрядчик учитывает согласованные отметки, существующие сети и особенности грунта в пределах предоставленных исходных данных.","","5. МАТЕРИАЛЫ И РАСТЕНИЯ",p.materials_summary||p.material_preferences||"Номенклатура материалов и посадочного материала определяется сметой/спецификацией.","","6. СЕЗОННОСТЬ И УХОД","Сроки работ, посадки и гарантийные обязательства учитывают сезонность. Гарантия на растения применяется при соблюдении согласованного режима полива, ухода и эксплуатации.","","7. ДОСТУП ТЕХНИКИ",p.travel_constraints||"Заказчик обеспечивает согласованный подъезд техники и доступ к участку."];
  if(kind==="installation") return ["","4. ИЗДЕЛИЯ, ОБОРУДОВАНИЕ И КОМПЛЕКТАЦИЯ",p.materials_summary||p.material_preferences||"Комплектация определяется предложением и спецификацией.","Подрядчик до монтажа проверяет доступные ему внешние признаки комплектности и пригодности места установки. О скрытых или выявленных препятствиях незамедлительно сообщает Заказчику.","","5. МОНТАЖ И НАСТРОЙКА","Состав монтажных, крепёжных, подключочных и настроечных операций определяется заданием. Дополнительная подготовка основания или коммуникаций выполняется только при согласовании.","","6. ПРИЁМКА","При приёмке проверяются комплектность, внешний вид, работоспособность и иные критерии, применимые к предмету монтажа.","","7. ДОСТУП",p.travel_constraints||"Заказчик обеспечивает доступ к месту монтажа в согласованное время."];
  return ["","4. МАТЕРИАЛЫ, ОБОРУДОВАНИЕ И СМЕТА",p.materials_summary||p.material_preferences||"Материалы и оборудование определяются сметой и спецификациями.",`Исключения: ${p.exclusions||"не заявлены, кроме прямо следующих из сметы и приложений"}.`,"Замена согласованного материала или технического решения, влияющая на цену, качество или внешний вид, требует согласования Заказчика.","","5. ПОДГОТОВКА ОБЪЕКТА И ДОКУМЕНТАЦИЯ",`Состояние объекта: ${p.current_condition||"согласно заявке"}. Проектная документация: ${p.design_readiness||"не требуется либо уточняется"}. Разрешения: ${p.permit_readiness||"не требуется либо уточняется"}.`,`Доступ: ${p.travel_constraints||"в согласованные сторонами периоды"}.`,"","6. ЭТАПЫ, СКРЫТЫЕ РАБОТЫ И ИЗМЕНЕНИЯ","Этапы и контрольные точки определяются рабочим пространством и приложениями. Скрытые работы предъявляются до закрытия, когда это предусмотрено характером работ. Отклонения от задания, дополнительные работы и изменение материалов фиксируются до их выполнения.","","7. СОХРАННОСТЬ И БЕЗОПАСНОСТЬ","Стороны определяют зоны работ, порядок хранения материалов и доступ третьих лиц. Подрядчик соблюдает обязательные требования охраны труда, пожарной и иной безопасности, применимые к выполняемым работам."];
}

function numberOrNull(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null}
function revalidateContractPages(id:string){revalidatePath(`/customer/work/${id}/contract`);revalidatePath(`/contractor/work/${id}/contract`);revalidatePath(`/customer/work/${id}`);revalidatePath(`/contractor/work/${id}`)}
