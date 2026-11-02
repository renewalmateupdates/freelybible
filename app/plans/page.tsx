import type { Metadata } from 'next'
import PlansList from '@/components/plans/PlansList'

export const metadata: Metadata = {
  title: 'Reading plans',
  description: 'Free Bible reading plans: the Bible in a year, the New Testament in 90 days, the Gospels in 30 days and more.',
}

export default function PlansPage() {
  return <PlansList />
}
