import type React from "react"
import "./globals.css"
import { Outfit } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

// Using a different variable name to avoid redeclaration
const outfitFont = Outfit({ subsets: ["latin"] })

// Using a different variable name to avoid redeclaration
export const metadataConfig = {
  title: "Sciensaurus - AI Scientific Research Companion",
  description:
    "AI-powered scientific research companion that makes complex research accessible with clear summaries, key insights, and related research.",
}

// Renamed to avoid duplicate function implementation
export function FirstRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

const outfit = Outfit({ subsets: ["latin"] })

export const metadata = {
  title: "Sciensaurus - AI Scientific Research Companion",
  description:
    "AI-powered scientific research companion that makes complex research accessible with clear summaries, key insights, and related research.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="sciensaurus-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

