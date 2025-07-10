import "./globals.css"
import { Inter } from "next/font/google"
import { TopNav } from "@/components/admin/top-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsProvider } from "@/contexts/settings-context"
import type React from "react"
import { Sidebar } from "@/components/admin/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Patungan Dashboard",
  description: "Management Information System for Patungan Split Bill Application - Gojek Partnership Project",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SettingsProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopNav />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
              <div className="container mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SettingsProvider>
  )
}
