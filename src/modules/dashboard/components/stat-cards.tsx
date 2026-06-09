"use client"

import { Database, FileSpreadsheet, GitMerge, Layers } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardStats } from "@/modules/dashboard/services/dashboard-services"

interface StatCardsProps {
  stats: DashboardStats
}

const cardMeta = [
  {
    key: "totalMasterDataRecords",
    label: "マスタデータ総数",
    description: "全マスタデータの合計",
    icon: Database,
    color: "text-blue-600",
  },
  {
    key: "totalMappings",
    label: "マッピング設定",
    description: "インポートマッピング + 固定値",
    icon: GitMerge,
    color: "text-purple-600",
  },
  {
    key: "totalImportBatches",
    label: "インポートバッチ",
    description: "インポート済みバッチ総数",
    icon: Layers,
    color: "text-amber-600",
  },
  {
    key: "totalExportHistory",
    label: "エクスポート履歴",
    description: "CSV出力履歴総数",
    icon: FileSpreadsheet,
    color: "text-green-600",
  },
]

function formatNumber(n: number): string {
  if (n >= 1000) return n.toLocaleString("ja-JP")
  return n === 0 ? "-" : String(n)
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cardMeta.map(({ key, label, description, icon: Icon, color }) => {
        const value = stats[key as keyof DashboardStats] as number
        return (
          <Card key={key} className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <Icon className={`size-4 ${color}`} />
                {label}
              </CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">
                {formatNumber(value)}
              </CardTitle>
            </CardHeader>
            <CardDescription className="px-6 pb-4">
              {description}
            </CardDescription>
          </Card>
        )
      })}
    </div>
  )
}
