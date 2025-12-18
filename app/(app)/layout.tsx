import type { ReactNode } from "react"

import { AppHeader } from "@/components/app-header"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}





