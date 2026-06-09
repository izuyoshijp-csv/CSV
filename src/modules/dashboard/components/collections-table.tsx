"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CollectionCount } from "@/modules/dashboard/services/dashboard-services"

interface CollectionsTableProps {
  collectionCounts: CollectionCount[]
}

const categoryBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  masterdata: { label: "マスタデータ", variant: "default" },
  mapping: { label: "マッピング", variant: "secondary" },
  batch: { label: "バッチ", variant: "outline" },
}

export function CollectionsTable({ collectionCounts }: CollectionsTableProps) {
  const masterData = collectionCounts.filter((c) => c.category === "masterdata")
  const mapping = collectionCounts.filter((c) => c.category === "mapping")
  const batch = collectionCounts.filter((c) => c.category === "batch")

  return (
    <Card>
      <CardHeader>
        <CardTitle>コレクション一覧</CardTitle>
        <CardDescription>Firestore コレクション別のデータ件数</CardDescription>
      </CardHeader>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>コレクション名</TableHead>
              <TableHead>表示名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="text-right">件数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collectionCounts.map((col) => {
              const badge = categoryBadge[col.category]
              return (
                <TableRow key={col.collectionName}>
                  <TableCell className="font-mono text-xs">{col.collectionName}</TableCell>
                  <TableCell>{col.displayName}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {col.count.toLocaleString("ja-JP")}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex gap-6 border-t px-6 py-3 text-sm text-muted-foreground">
        <span>マスタデータ: <span className="font-medium text-foreground">{masterData.reduce((s, c) => s + c.count, 0).toLocaleString("ja-JP")}</span> 件</span>
        <span>マッピング: <span className="font-medium text-foreground">{mapping.reduce((s, c) => s + c.count, 0).toLocaleString("ja-JP")}</span> 件</span>
        <span>バッチ: <span className="font-medium text-foreground">{batch.reduce((s, c) => s + c.count, 0).toLocaleString("ja-JP")}</span> 件</span>
      </div>
    </Card>
  )
}
