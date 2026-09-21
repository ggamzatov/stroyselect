import Link from "next/link"
import { ArrowRight, Send } from "lucide-react"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageFrame } from "@/components/layout/page-frame"
import { PageHeader } from "@/components/patterns/page-header"
import { Button } from "@/components/ui/button"
import { ContractorBidCard } from "@/features/bids/components/contractor-bid-card"
import { getMyBids } from "@/features/bids/queries/get-my-bids"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

const awaitingStatuses = new Set(["submitted", "viewed", "shortlisted"])
const selectedStatuses = new Set(["accepted"])

export default async function ContractorBidsPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role !== "contractor") redirect("/dashboard")
  const bids = await getMyBids()
  const awaiting = bids.filter((bid) => awaitingStatuses.has(bid.status))
  const selected = bids.filter((bid) => selectedStatuses.has(bid.status))
  const closed = bids.filter((bid) => !awaitingStatuses.has(bid.status) && !selectedStatuses.has(bid.status))

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <PageHeader eyebrow="Работа с заказами" title="Мои предложения" description="Здесь видно, что вы предложили заказчику и какое решение принято по каждому заказу." actions={<Button render={<Link href="/contractor/projects" />}><Send data-icon="inline-start" />Найти заказы</Button>} />
      {bids.length === 0 ? <EmptyState className="mt-8" icon={Send} title="Вы ещё не отправляли предложения" description="Найдите подходящий заказ и предложите заказчику стоимость, сроки и условия выполнения." action={<Button render={<Link href="/contractor/projects" />}>Найти заказы<ArrowRight data-icon="inline-end" /></Button>} /> : <div className="mt-8 space-y-9"><BidSection title="Ждут решения" description="Заказчик рассматривает ваши условия" bids={awaiting} /><BidSection title="Выбраны заказчиком" description="Предложения, по которым можно перейти к объекту" bids={selected} /><BidSection title="Завершённые" description="Предложения, которые больше не участвуют в выборе" bids={closed} /></div>}
    </PageFrame>
  )
}

function BidSection({ title, description, bids }: { title: string; description: string; bids: Awaited<ReturnType<typeof getMyBids>> }) {
  if (!bids.length) return null
  return <section aria-label={title}><div><h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="mt-4 space-y-4">{bids.map((bid) => <ContractorBidCard key={bid.id} bid={bid} />)}</div></section>
}
