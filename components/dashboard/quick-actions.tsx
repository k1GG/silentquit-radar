"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

type QuickActionsProps = {
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
}

export function QuickActions({ title, description, ctaLabel, ctaHref }: QuickActionsProps) {
  return (
    <div className="flex items-center justify-between bg-card border border-border/50 rounded-lg p-6">
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Link href={ctaHref}>
          {ctaLabel}
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </div>
  )
}





