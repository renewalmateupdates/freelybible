import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PLANS, planById } from '@/lib/plans'
import PlanView from '@/components/plans/PlanView'

export const dynamicParams = false

export function generateStaticParams() {
  return PLANS.map((p) => ({ id: p.id }))
}

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const plan = planById((await params).id)
  return plan ? { title: plan.name, description: `${plan.description} Free, no account needed.` } : {}
}

export default async function PlanPage({ params }: Params) {
  const { id } = await params
  if (!planById(id)) notFound()
  return <PlanView id={id} />
}
