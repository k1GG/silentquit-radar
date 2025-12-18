"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function navLinkClass(path: string, current: string) {
  const isActive = current === path
  return [
    "text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
  ].join(" ")
}

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border/50 bg-card/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <div className="size-4 rounded-sm bg-primary" />
            </div>
            <span className="text-xl font-semibold">SilentQuit Radar</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className={navLinkClass("/dashboard", pathname)}>
              Dashboard
            </Link>
            <Link href="/employees" className={navLinkClass("/employees", pathname)}>
              Employees
            </Link>
            <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
              AC
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}





