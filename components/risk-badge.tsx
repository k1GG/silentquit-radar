import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getRiskColor, getRiskLabel, RiskLevel } from "@/lib/engagementRisk"

interface RiskBadgeProps {
  level: RiskLevel
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const color = getRiskColor(level)
  const label = getRiskLabel(level)

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        color === "red" && "border-destructive/50 bg-destructive/10 text-destructive",
        color === "yellow" && "border-chart-2/50 bg-chart-2/10 text-chart-2",
        color === "green" && "border-chart-1/50 bg-chart-1/10 text-chart-1",
      )}
    >
      {label}
    </Badge>
  )
}
