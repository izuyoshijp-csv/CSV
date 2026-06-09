import { DashboardContent } from "@/modules/dashboard/components/dashboard-content"

export default function Page() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground text-sm">
            マスタデータ・マッピング設定・CSV作成の概要
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <DashboardContent />
      </div>
    </>
  )
}
