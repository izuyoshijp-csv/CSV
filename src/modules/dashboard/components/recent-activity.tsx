"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ActivityItem } from "@/modules/dashboard/services/dashboard-services"

interface RecentActivityProps {
  recentActivity: ActivityItem[]
}

const typeLabels: Record<string, string> = {
  import: "インポート",
  export: "エクスポート",
  mapping_update: "マッピング更新",
  masterdata_update: "マスタ更新",
}

const typeColors: Record<string, string> = {
  import: "bg-blue-100 text-blue-700",
  export: "bg-green-100 text-green-700",
  mapping_update: "bg-purple-100 text-purple-700",
  masterdata_update: "bg-amber-100 text-amber-700",
}

const statusLabels: Record<string, string> = {
  imported: "インポート済み",
  rules_applied: "ルール適用済",
  needs_review: "要レビュー",
  needs_master_data: "マスタデータ要確認",
  validated_complete: "検証完了",
  exported_complete: "エクスポート完了",
  exported_with_missing_data: "欠損ありエクスポート",
}

export function RecentActivity({ recentActivity }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近のインポート履歴</CardTitle>
        <CardDescription>直近のバッチインポート処理</CardDescription>
      </CardHeader>
      <div className="space-y-1 px-6 pb-4">
        {recentActivity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            インポート履歴がありません
          </p>
        ) : (
          <div className="divide-y">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeColors[item.type] ?? "bg-gray-100 text-gray-700"}`}>
                    {typeLabels[item.type] ?? item.type}
                  </span>
                  <span className="font-medium">{item.description}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.status && (
                    <Badge variant="outline">{statusLabels[item.status] ?? item.status}</Badge>
                  )}
                  {item.count != null && <span>{item.count.toLocaleString("ja-JP")} 行</span>}
                  {item.timestamp && <span>{item.timestamp}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
