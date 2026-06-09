import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { AuthProvider } from "@/components/auth-provider";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "受注CSV",
  description: "受注CSV管理アプリ",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      translate="no"
      className={`${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} notranslate`} translate="no">
        <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
          <AuthProvider>
            <SidebarConfigProvider>
              {children}
            </SidebarConfigProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
