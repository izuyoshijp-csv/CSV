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
  const [isSynced, setIsSynced] = React.useState(false)

  React.useEffect(() => {
    const auth = getAuthSafe()
    let cancelled = false

    if (status === "loading") {
      setIsSynced(false)
      return
    }

    if (!auth) {
      setIsSynced(true)
      return
    }

    const syncAuth = async () => {
      try {
        if (status === "authenticated") {
          if (!session?.firebaseToken) {
            console.error("NextAuth session is missing Firebase custom token.")
            return
          }

          const currentUser = auth.currentUser
          if (!currentUser || currentUser.uid !== session.user.id) {
            await signInWithCustomToken(auth, session.firebaseToken)
            console.log("Firebase Client SDK successfully authenticated via Custom Token.")
          }
        } else if (status === "unauthenticated" && auth.currentUser) {
            await firebaseSignOut(auth)
            console.log("Firebase Client SDK successfully logged out.")
        }
      } catch (error) {
        console.error("Failed to sync Firebase Client SDK with NextAuth session:", error)
      } finally {
        if (!cancelled) setIsSynced(true)
      }
    }

    void syncAuth()
    return () => {
      cancelled = true
    }
  }, [session, status])

  if (!isSynced) return null

  return <>{children}</>
}
