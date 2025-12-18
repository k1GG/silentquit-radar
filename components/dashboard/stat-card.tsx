"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type StatCardProps = {
  title: string
  value: ReactNode
  description?: string
  icon: ReactNode
  valueClassName?: string
}

export function StatCard({ title, value, description, icon, valueClassName }: StatCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-semibold ${valueClassName ?? ""}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}


