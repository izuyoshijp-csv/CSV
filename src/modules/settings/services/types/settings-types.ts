export interface CurrentPlan {
  planName: string
  price: string
  nextBilling: string
  status: string
  daysUsed: number
  totalDays: number
  progressPercentage: number
  remainingDays: number
  needsAttention: boolean
  attentionMessage: string
}

export interface BillingHistoryItem {
  id: number
  month: string
  plan: string
  amount: string
  status: string
}
