"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth"
import { getAuthSafe } from "@/lib/firebase/client"

export function FirebaseSessionSync({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  React.useEffect(() => {
    const auth = getAuthSafe()
    if (!auth) return

    const syncAuth = async () => {
      if (status === "authenticated" && session?.firebaseToken) {
        const currentUser = auth.currentUser
        if (!currentUser || currentUser.uid !== session.user.id) {
          try {
            await signInWithCustomToken(auth, session.firebaseToken)
            console.log("Firebase Client SDK successfully authenticated via Custom Token.")
          } catch (error) {
            console.error("Failed to sync Firebase Client SDK with NextAuth session:", error)
          }
        }
      } else if (status === "unauthenticated") {
        if (auth.currentUser) {
          try {
            await firebaseSignOut(auth)
            console.log("Firebase Client SDK successfully logged out.")
          } catch (error) {
            console.error("Failed to sign out Firebase Client SDK:", error)
          }
        }
      }
    }

    syncAuth()
  }, [session, status])

  return <>{children}</>
}
