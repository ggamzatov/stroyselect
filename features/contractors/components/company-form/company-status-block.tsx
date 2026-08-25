import Link from "next/link";
import {
  Clock3,
  FileEdit,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type Props = {
  status: string;
  comment: string | null;
};

export function CompanyStatusBlock({ status, comment }: Props) {
  if (status === "pending") {
    return <StatusCard icon={<Clock3 className="h-5 w-5" />} title="Профиль ожидает проверки" description="Редактирование временно заблокировано. Документы, лицензии, СРО и страхование можно контролировать в Центре доверия." className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200" />;
  }

  if (status === "verified") {
    return <StatusCard icon={<ShieldCheck className="h-5 w-5" />} title="Документы и разрешения" description="Статус подтверждения указан в верхнем блоке. Здесь можно следить за сроками лицензий, сертификатов, СРО и страхования." className="border-border bg-secondary/35 text-foreground" />;
  }

  if (status === "rejected") {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"><TriangleAlert className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><h2 className="font-bold">Профиль требует исправлений</h2><p className="mt-1 text-sm leading-6 opacity-85">Исправьте данные и проверочные документы, затем повторно отправьте профиль.</p><div className="mt-4 rounded-xl border border-red-200 bg-white/70 p-4 text-foreground dark:border-red-900/50 dark:bg-black/20"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-600 dark:text-red-300">Комментарий администратора</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{comment || "Комментарий не указан"}</p></div><TrustLink /></div>
        </div>
      </div>
    );
  }

  return <StatusCard icon={<FileEdit className="h-5 w-5" />} title="Черновик профиля" description="Заполните компанию и добавьте подтверждающие документы перед отправкой на проверку." className="border-border bg-secondary/40 text-foreground" />;
}

function StatusCard({ icon,title,description,className }: { icon: React.ReactNode; title:string; description:string; className:string }) {
  return <div className={["min-w-0 rounded-[1.5rem] border p-5",className].join(" ")}><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/60 dark:bg-black/20">{icon}</div><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{title}</h2><p className="mt-1 break-words text-sm leading-6 opacity-80">{description}</p><TrustLink /></div></div></div>;
}
function TrustLink() { return <Link href="/contractor/company/trust" className="mt-4 inline-flex rounded-xl border border-current/20 bg-white/50 px-3 py-2 text-xs font-bold transition hover:bg-white/80 dark:bg-black/10 dark:hover:bg-black/20">Открыть Центр доверия</Link>; }
