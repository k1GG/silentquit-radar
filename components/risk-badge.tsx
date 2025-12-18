import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RiskLevel = "high" | "medium" | "low"

interface RiskBadgeProps {
  level: RiskLevel
}

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        level === "high" && "border-destructive/50 bg-destructive/10 text-destructive",
        level === "medium" && "border-chart-2/50 bg-chart-2/10 text-chart-2",
        level === "low" && "border-chart-1/50 bg-chart-1/10 text-chart-1",
      )}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </Badge>
  )
}
