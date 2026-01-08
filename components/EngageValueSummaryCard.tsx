import { createSupabaseServerClient } from "@/lib/supabaseServer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function EngageValueSummaryCard() {
  const supabase = await createSupabaseServerClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from("engagement_roi_snapshots")
    .select("estimated_attrition_cost, expected_savings")
    .eq("created_date", today)

  if (!data || data.length === 0) {
    return null // do not render card if no data
  }

  const totalLoss = data.reduce((s, r) => s + r.estimated_attrition_cost, 0)
  const totalSavings = data.reduce((s, r) => s + r.expected_savings, 0)

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle>💰 EngageValue™ Impact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-red-500 font-semibold">
          Attrition Exposure: {formatCurrency(totalLoss)}
        </p>
        <p className="text-green-500 font-semibold">
          Preventable Loss: {formatCurrency(totalSavings)}
        </p>

        <Button asChild className="w-full">
          <Link href="/hr/dashboard/engagevalue">
            View EngageValue™ Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}