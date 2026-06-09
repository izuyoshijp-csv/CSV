"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { FirebaseSessionSync } from "./firebase-session-sync"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FirebaseSessionSync>{children}</FirebaseSessionSync>
    </SessionProvider>
  )
}
