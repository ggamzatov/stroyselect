import { BadgeCheck, CircleDollarSign, PackageCheck, ReceiptText, Truck } from "lucide-react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getMaterialProjectParticipant } from "@/lib/materials/get-material-project-participant";
import { createMaterialOrder, createMaterialOrderCheckout } from "@/features/materials/actions/material-order";

type Role="customer"|"contractor";
type ListRow={id:string;status:string;selected_quote_id:string|null};
type OrderRow={id:string;status:string;goods_subtotal_minor:string|number;currency:string;supplier_name_snapshot:string;platform_commission_minor:string|number;supplier_net_minor:string|number;ordered_at:Date|string;paid_at:Date|string|null};
type PaymentRow={status:string;created_at:Date|string;paid_at:Date|string|null};
type Props={projectId:string;role:Role;query:Record<string,string|string[]|undefined>};

export async function MaterialOrderPanel({projectId,role,query}:Props){
  const activeUser=await requireActiveUser();
  if(!activeUser.success)redirect("/login");
  if(activeUser.profile.role!==role)redirect("/dashboard");
  const ctx=await getMaterialProjectParticipant(projectId,activeUser.user.id,activeUser.profile.role);
  if(!ctx.success)return null;

  const listResult=await db.query<ListRow>(`SELECT id,status,selected_quote_id FROM public.project_material_lists WHERE project_id=$1::uuid ORDER BY created_at DESC LIMIT 1`,[projectId]);
  const list=listResult.rows[0];
  if(!list||!["selected","ordered"].includes(list.status))return null;

  const orderResult=await db.query<OrderRow>(`
    SELECT id,status,goods_subtotal_minor,currency,supplier_name_snapshot,platform_commission_minor,supplier_net_minor,ordered_at,paid_at
    FROM public.material_orders WHERE list_id=$1::uuid LIMIT 1
  `,[list.id]);
  const order=orderResult.rows[0]??null;
  const paymentResult=order?await db.query<PaymentRow>(`SELECT status,created_at,paid_at FROM public.material_order_payments WHERE order_id=$1::uuid ORDER BY created_at DESC LIMIT 1`,[order.id]):{rows:[] as PaymentRow[]};
  const payment=paymentResult.rows[0]??null;
  const customer=role==="customer";
  const notice=query.order==="created"?"Заказ создан. Сумма зафиксирована по выбранному предложению.":query.order==="existing"?"Заказ уже был создан ранее.":query.payment==="return"?"Вы вернулись из кассы. Оплата считается подтверждённой только после серверного уведомления ЮKassa.":query.payment==="confirmed"?"Оплата заказа подтверждена.":query.order_error?errorMessage(String(query.order_error)):null;

  if(!order){
    return <section className="app-container pb-8"><div className="rounded-[1.75rem] border border-primary/25 bg-card p-6 shadow-[var(--shadow-soft)]"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><PackageCheck className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">Следующий шаг закупки</p><h2 className="mt-1 text-xl font-bold">Оформить заказ по выбранному предложению</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Заказ скопирует выбранные цены и позиции в неизменяемый финансовый снимок. Доставка будет рассчитана отдельным модулем и сейчас в сумму не входит.</p>{customer&&list.selected_quote_id?<form action={createMaterialOrder} className="mt-5"><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="listId" value={list.id}/><input type="hidden" name="quoteId" value={list.selected_quote_id}/><button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Оформить заказ</button></form>:<p className="mt-4 text-sm font-semibold text-muted-foreground">Заказ оформляет заказчик проекта.</p>}</div></div></div></section>;
  }

  return <section className="app-container pb-8"><div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">{notice&&<div className="mb-5 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm font-semibold">{notice}</div>}<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm font-semibold text-primary">Заказ материалов</p><h2 className="mt-1 text-2xl font-bold">{order.supplier_name_snapshot}</h2><p className="mt-2 text-sm text-muted-foreground">Создан {dateTime(order.ordered_at)} · статус: <span className="font-semibold text-foreground">{statusLabel(order.status)}</span></p></div><div className="rounded-2xl bg-secondary px-5 py-4 text-right"><p className="text-xs text-muted-foreground">К оплате за товары</p><p className="mt-1 text-2xl font-black">{money(order.goods_subtotal_minor,order.currency)}</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Info icon={<ReceiptText className="h-4 w-4"/>} label="Цена" value="Зафиксирована из выбранного тендера"/><Info icon={<CircleDollarSign className="h-4 w-4"/>} label="Комиссия StroySelect" value="Удерживается из расчёта с поставщиком"/><Info icon={<Truck className="h-4 w-4"/>} label="Доставка" value="Будет рассчитана отдельно"/></div>{order.status==="awaiting_payment"&&customer&&<form action={createMaterialOrderCheckout} className="mt-6"><input type="hidden" name="orderId" value={order.id}/><button className="min-h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">Перейти к оплате</button></form>}{order.status==="awaiting_payment"&&!customer&&<p className="mt-6 text-sm font-semibold text-muted-foreground">Ожидается оплата заказчиком.</p>}{["paid","supplier_confirmed","delivery_pending","in_delivery","delivered","completed"].includes(order.status)&&<div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><BadgeCheck className="h-5 w-5"/>Оплата подтверждена сервером{order.paid_at?` ${dateTime(order.paid_at)}`:""}.</div>}{payment?.status==="pending"&&order.status==="awaiting_payment"&&<p className="mt-3 text-xs text-muted-foreground">Создан платёж в ЮKassa. Повторное нажатие продолжит тот же платёж и не создаст дубль.</p>}</div></section>;
}

function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-border bg-background/60 p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold text-muted-foreground">{label}</span></div><p className="mt-2 text-sm font-semibold">{value}</p></div>}
function money(value:string|number,currency:string){return new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:0}).format(Number(value)/100)}
function dateTime(value:Date|string){return new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}
function statusLabel(status:string){const labels:Record<string,string>={awaiting_payment:"Ожидает оплаты",paid:"Оплачен",supplier_confirmed:"Подтверждён поставщиком",delivery_pending:"Ожидает доставки",in_delivery:"В доставке",delivered:"Доставлен",completed:"Завершён",cancelled:"Отменён",refunded:"Возврат"};return labels[status]??status}
function errorMessage(code:string){const messages:Record<string,string>={status:"На текущем статусе проекта заказ нельзя оплачивать.",quote:"Выбранное предложение недоступно или срок цены истёк.",incomplete:"Предложение неполное — заказ не создан.",create:"Не удалось оформить заказ.",provider:"ЮKassa ещё не настроена администратором.",origin:"Не удалось определить адрес возврата после оплаты.",payment:"Не удалось создать платёж.",confirmation:"ЮKassa не вернула страницу подтверждения.",payment_state:"Заказ сейчас нельзя оплачивать."};return messages[code]??"Операция заказа не выполнена."}
