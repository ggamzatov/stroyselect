import { redirect } from "next/navigation";
import { Bell, Mail, MessageSquare, Megaphone, ShieldAlert, Sparkles } from "lucide-react";

import { getNotificationPreferences } from "@/features/notifications/queries/get-notification-preferences";
import { saveNotificationPreferences } from "@/features/notifications/actions/save-notification-preferences";

export default async function NotificationSettingsPage() {
  const data = await getNotificationPreferences();
  if (!data) redirect("/login");

  const p = data.preferences;
  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Bell className="h-6 w-6" /></div>
            <div><p className="text-sm font-semibold text-primary">Уведомления</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">Настройки уведомлений</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Выберите, какие события должны приходить внутри приложения и по email. Системные сообщения безопасности могут отправляться независимо от этих настроек.</p></div>
          </div>
        </section>

        <form action={saveNotificationPreferences} className="mt-6 space-y-5">
          <PreferenceSection title="Каналы" description="Как StroySelect может связываться с вами.">
            <Toggle name="inAppEnabled" defaultChecked={p.in_app_enabled} icon={<Bell className="h-4 w-4" />} title="В приложении" description="Колокольчик, лента событий и важные статусы." />
            <Toggle name="emailEnabled" defaultChecked={p.email_enabled} icon={<Mail className="h-4 w-4" />} title="Email" description="Важные события проекта и аккаунта на почту." />
          </PreferenceSection>

          <PreferenceSection title="Типы событий" description="Тонкая настройка рабочих уведомлений.">
            <Toggle name="projectUpdates" defaultChecked={p.project_updates} icon={<Sparkles className="h-4 w-4" />} title="Проекты и этапы" description="Изменения проекта, этапов, документов и платежей." />
            <Toggle name="bidUpdates" defaultChecked={p.bid_updates} icon={<Bell className="h-4 w-4" />} title="Предложения и приглашения" description="Новые bids, shortlist и ответы на приглашения." />
            <Toggle name="chatUpdates" defaultChecked={p.chat_updates} icon={<MessageSquare className="h-4 w-4" />} title="Сообщения" description="Новые сообщения и вложения в рабочих чатах." />
            <Toggle name="disputeUpdates" defaultChecked={p.dispute_updates} icon={<ShieldAlert className="h-4 w-4" />} title="Споры и риски" description="Споры, приостановки проекта и решения администрации." />
            <Toggle name="marketingEnabled" defaultChecked={p.marketing_enabled} icon={<Megaphone className="h-4 w-4" />} title="Новости продукта" description="Редкие продуктовые обновления. По умолчанию выключено." />
          </PreferenceSection>

          <div className="flex justify-end"><button className="min-h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">Сохранить настройки</button></div>
        </form>
      </div>
    </main>
  );
}

function PreferenceSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><h2 className="text-xl font-black text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p><div className="mt-5 divide-y divide-border">{children}</div></section>;
}
function Toggle({ name, defaultChecked, icon, title, description }: { name: string; defaultChecked: boolean; icon: React.ReactNode; title: string; description: string }) {
  return <label className="flex cursor-pointer items-center gap-4 py-4 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 accent-[var(--primary)]" /></label>;
}
