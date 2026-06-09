import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import * as admin from "firebase-admin"

// Initialize Firebase Admin safely
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n"
        ),
      }),
    })
  } catch (error) {
    console.error("Firebase Admin initialization error:", error)
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || typeof credentials.idToken !== "string") {
          return null
        }

        try {
          const decodedToken = await admin
            .auth()
            .verifyIdToken(credentials.idToken)

          // Generate a custom token for the client side to keep Firebase Client auth in sync
          const customToken = await admin
            .auth()
            .createCustomToken(decodedToken.uid)

          return {
            id: decodedToken.uid,
            name:
              decodedToken.name ||
              decodedToken.email?.split("@")[0] ||
              "User",
            email: decodedToken.email,
            image: decodedToken.picture || "",
            customToken: customToken,
          }
        } catch (error) {
          console.error("Error authorizing with Firebase ID Token:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.customToken = user.customToken
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.uid as string
        session.firebaseToken = token.customToken as string
      }
      return session
    },
  },
})
