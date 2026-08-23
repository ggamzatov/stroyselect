import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Bookmark,
  CheckCircle2,
  Clock3,
  EyeOff,
  Heart,
  MailPlus,
  MapPin,
  Sparkles,
  Star,
  UsersRound,
  XCircle,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getMyProject } from "@/features/projects/queries/get-my-project";
import {
  getProjectContractorMatches,
  type MatchScoreComponents,
  type ProjectContractorMatch,
} from "@/features/projects/queries/get-project-contractor-matches";
import { assessProjectIntake } from "@/features/projects/lib/assess-project-intake";
import { inviteContractorToProject } from "@/features/projects/actions/invite-contractor-to-project";
import { setProjectMatchPreference } from "@/features/projects/actions/set-project-match-preference";
import {
  cancelProjectInvitation,
  setProjectInvitationShortlisted,
} from "@/features/projects/actions/manage-project-invitation";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerProjectMatchesPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const [project, matches] = await Promise.all([
    getMyProject(id),
    getProjectContractorMatches(id, 12),
  ]);
  const intake = assessProjectIntake(project);

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link href={`/customer/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Вернуться к проекту</Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary"><Sparkles className="h-4 w-4" />StroySelect Matching 2.0</div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] md:text-5xl">Подходящие подрядчики</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">Подбор учитывает категорию, географию, бюджет, StroySelect Score, опыт на похожих проектах, скорость ответа, завершение и историю споров. Результат сохраняется как объяснимый snapshot.</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2"><MapPin className="h-4 w-4 text-primary" />{project.city || "Город не указан"}</span><span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2"><Banknote className="h-4 w-4 text-primary" />{formatBudget(project.budget_min, project.budget_max)}</span><span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2"><UsersRound className="h-4 w-4 text-primary" />Найдено: {matches.length}</span></div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><CheckCircle2 className="h-5 w-5" /></div><div><h2 className="font-bold">Почему подрядчик подходит</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">У каждой карточки есть факторы score и понятные причины. Сохранённые подрядчики поднимаются выше, скрытые больше не показываются для этого проекта.</p></div></div></section>
          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Project Intake</p><h2 className="mt-1 font-bold">Готовность проекта</h2></div><span className="text-2xl font-black text-primary">{intake.score}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${intake.score}%` }} /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Заполнено {intake.completedChecks} из {intake.totalChecks} ключевых сигналов.</p></section>
        </div>

        {matches.length === 0 ? <section className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-card p-8 text-center"><UsersRound className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-bold">Пока нет точных совпадений</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Уточните категорию, город или бюджет проекта либо верните ранее скрытых подрядчиков через менеджера.</p></section> : <div className="mt-6 grid gap-5 lg:grid-cols-2">{matches.map((match,index) => <MatchCard key={match.contractorId} projectId={project.id} match={match} position={index+1} />)}</div>}
      </div>
    </main>
  );
}

function MatchCard({ projectId, match, position }: { projectId:string; match:ProjectContractorMatch; position:number }) {
  return (
    <article className={["overflow-hidden rounded-[1.75rem] border bg-card shadow-[var(--shadow-soft)]",match.isShortlisted || match.isSaved ? "border-primary/40 ring-2 ring-primary/10" : "border-border"].join(" ")}>
      <div className="border-b border-border bg-secondary/30 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">#{position}</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Проверен</span>{match.isSaved && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"><Heart className="h-3.5 w-3.5" />Сохранён</span>}{match.isShortlisted && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary"><Bookmark className="h-3.5 w-3.5" />Shortlist</span>}{match.invitationStatus && <InvitationBadge status={match.invitationStatus} />}</div><h2 className="mt-3 truncate text-xl font-black">{match.publicName}</h2></div><div className="shrink-0 text-right"><p className="text-2xl font-black text-primary">{Math.round(match.matchScore)}%</p><p className="text-[11px] text-muted-foreground">совпадение</p></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(match.matchScore,100)}%` }} /></div>
      </div>

      <div className="p-5 md:p-6">
        <div className="grid grid-cols-3 gap-3"><Metric icon={<Star className="h-4 w-4" />} label="Рейтинг" value={match.ratingCount>0?match.rating.toFixed(1):"Новый"} /><Metric icon={<Clock3 className="h-4 w-4" />} label="Ответы" value={`${Math.round(match.responseRate)}%`} /><Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Завершение" value={`${Math.round(match.completionRate)}%`} /></div>
        <div className="mt-5 flex flex-wrap gap-2">{match.reasons.map((reason) => <span key={reason} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">{reason}</span>)}</div>

        <details className="mt-5 rounded-2xl border border-border bg-background p-4"><summary className="cursor-pointer text-sm font-bold text-primary">Факторы matching score</summary><div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(match.scoreComponents).map(([key,value]) => <div key={key} className="flex items-center justify-between rounded-xl bg-secondary/45 px-3 py-2 text-xs"><span className="text-muted-foreground">{componentLabel(key as keyof MatchScoreComponents)}</span><strong>+{value}</strong></div>)}</div></details>

        {(match.minimumProjectBudget!==null || match.maximumProjectBudget!==null) && <p className="mt-5 text-sm text-muted-foreground">Обычный бюджет: <strong className="text-foreground">{formatBudget(match.minimumProjectBudget,match.maximumProjectBudget)}</strong></p>}

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Link href={`/customer/contractors/${match.contractorId}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-secondary">Профиль</Link>
          <form action={setProjectMatchPreference}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contractorId" value={match.contractorId} /><input type="hidden" name="preference" value={match.isSaved?"neutral":"saved"} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-secondary px-3 text-sm font-semibold text-primary"><Heart className="h-4 w-4" />{match.isSaved?"Не сохранять":"Сохранить"}</button></form>
          <form action={setProjectMatchPreference}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contractorId" value={match.contractorId} /><input type="hidden" name="preference" value="dismissed" /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-muted-foreground"><EyeOff className="h-4 w-4" />Не показывать</button></form>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <form action={setProjectInvitationShortlisted}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contractorId" value={match.contractorId} /><input type="hidden" name="shortlisted" value={String(!match.isShortlisted)} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-secondary px-4 text-sm font-semibold text-primary"><Bookmark className="h-4 w-4" />{match.isShortlisted?"Убрать из shortlist":"В shortlist"}</button></form>
          {!match.isInvited || match.invitationStatus==="cancelled" ? <form action={inviteContractorToProject}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contractorId" value={match.contractorId} /><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><MailPlus className="h-4 w-4" />Пригласить к проекту</button></form> : match.invitationStatus==="invited" || match.invitationStatus==="viewed" ? <form action={cancelProjectInvitation}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contractorId" value={match.contractorId} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground"><XCircle className="h-4 w-4" />Отменить приглашение</button></form> : <div className="flex min-h-11 items-center justify-center rounded-xl bg-secondary/50 px-4 text-center text-sm font-semibold">{match.invitationStatus==="accepted"?"Подрядчик принял приглашение":"Подрядчик отказался"}</div>}
        </div>
      </div>
    </article>
  );
}

function InvitationBadge({ status }: { status:string }) { const label=status==="accepted"?"Принял":status==="declined"?"Отказался":status==="viewed"?"Просмотрел":status==="cancelled"?"Отменено":"Приглашён"; return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"><MailPlus className="h-3.5 w-3.5" />{label}</span>; }
function Metric({ icon,label,value }: { icon:React.ReactNode; label:string; value:string }) { return <div className="rounded-xl bg-secondary/45 p-3"><div className="flex items-center gap-1.5 text-primary">{icon}<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</span></div><p className="mt-2 text-base font-black">{value}</p></div>; }
function componentLabel(key:keyof MatchScoreComponents) { const labels:Record<keyof MatchScoreComponents,string>={category:"Категория",primaryService:"Основная специализация",geography:"География",budget:"Бюджет",relevantExperience:"Опыт в категории",propertyExperience:"Опыт на типе объекта",stroyselectScore:"StroySelect Score",rating:"Рейтинг",response:"Ответы",completion:"Завершение",disputeFree:"Без споров",bidWin:"Успешность предложений",deadline:"Соблюдение сроков",responseSpeed:"Скорость ответа"}; return labels[key]; }
function formatBudget(minimum:number|string|null,maximum:number|string|null) { const min=toNumber(minimum); const max=toNumber(maximum); if(min!==null&&max!==null)return `${formatMoney(min)} — ${formatMoney(max)}`; if(min!==null)return `от ${formatMoney(min)}`; if(max!==null)return `до ${formatMoney(max)}`; return "По договорённости"; }
function formatMoney(value:number) { return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`; }
function toNumber(value:unknown) { if(value===null||value===undefined||value==="")return null; const number=Number(value); return Number.isFinite(number)?number:null; }
