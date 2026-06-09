import billingHistoryData from "./data/billing/billing-history.json"
import currentPlanData from "./data/billing/current-plan.json"

import type { BillingHistoryItem, CurrentPlan } from "./types/settings-types"

export const settingsMockData = {
  currentPlan: currentPlanData as CurrentPlan,
  billingHistory: billingHistoryData as BillingHistoryItem[],
}
