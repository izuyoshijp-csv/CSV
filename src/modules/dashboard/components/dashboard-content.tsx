"use client"

import { useEffect, useState } from "react"
import { StatCards } from "@/modules/dashboard/components/stat-cards"
import { CollectionChart } from "@/modules/dashboard/components/collection-chart"
import { CollectionsTable } from "@/modules/dashboard/components/collections-table"
import { RecentActivity } from "@/modules/dashboard/components/recent-activity"
import { getDashboardData } from "@/modules/dashboard/services/dashboard-services"
import type { DashboardData } from "@/modules/dashboard/services/dashboard-services"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[340px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[200px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <StatCards stats={data.stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CollectionChart collectionCounts={data.stats.collectionCounts} />
        <RecentActivity recentActivity={data.recentActivity} />
      </div>

      <CollectionsTable collectionCounts={data.stats.collectionCounts} />
    </div>
  )
}
