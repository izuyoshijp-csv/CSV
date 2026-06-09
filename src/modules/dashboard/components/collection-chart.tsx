"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CollectionCount } from "@/modules/dashboard/services/dashboard-services"

interface CollectionChartProps {
  collectionCounts: CollectionCount[]
}

const categoryColors: Record<string, string> = {
  masterdata: "#3b82f6",
  mapping: "#a855f7",
  batch: "#f59e0b",
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: CollectionCount }>; label?: string }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const data = item.payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="font-medium">{data.displayName}</p>
      <p className="text-sm text-muted-foreground">{data.collectionName}</p>
      <p className="mt-1 text-lg font-semibold">{data.count.toLocaleString("ja-JP")} 件</p>
    </div>
  )
}

export function CollectionChart({ collectionCounts }: CollectionChartProps) {
  const chartData = collectionCounts.map((c) => ({
    name: c.displayName.length > 14 ? c.displayName.slice(0, 13) + "…" : c.displayName,
    fullName: c.displayName,
    count: c.count,
    category: c.category,
  }))

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>コレクション別データ件数</CardTitle>
        <CardDescription>マスタデータ・マッピング設定・インポートバッチ</CardDescription>
      </CardHeader>
      <div className="h-[300px] w-full px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => {
                const labelMap: Record<string, string> = {
                  masterdata: "マスタデータ",
                  mapping: "マッピング設定",
                  batch: "インポートバッチ",
                }
                return labelMap[value] ?? value
              }}
            />
            {["masterdata", "mapping", "batch"].map((cat) => (
              <Bar
                key={cat}
                dataKey="count"
                name={cat}
                fill={categoryColors[cat]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
