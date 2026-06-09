import { getFirestoreCollection, getFirestoreDocumentCollection } from "@/lib/firebase/firestore-query"

import { settingsMockData } from "./settings-mock-data"
import type { BillingHistoryItem, CurrentPlan } from "./types/settings-types"

export async function getBillingSettingsData() {
  const [currentPlans, billingHistory] = await Promise.all([
    getFirestoreDocumentCollection<CurrentPlan>("currentPlans", [settingsMockData.currentPlan]),
    getFirestoreCollection<BillingHistoryItem>("billingHistories", settingsMockData.billingHistory),
  ])

  return {
    currentPlan: currentPlans[0] ?? settingsMockData.currentPlan,
    billingHistory,
  }
}
