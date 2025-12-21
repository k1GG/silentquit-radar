import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function calculateRisk(score: number) {
  if (score >= 70) return "Low"
  if (score >= 40) return "Medium"
  return "High"
}

export async function POST(req: Request) {
  const body = await req.json()
  const { employee_id, q1, q2, q3 } = body

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1️⃣ Save survey response
  await supabase.from("engagement_surveys").insert({
    employee_id,
    q1,
    q2,
    q3,
  })

  // 2️⃣ Fetch current score
  const { data: scoreRow } = await supabase
    .from("engagement_scores")
    .select("score")
    .eq("employee_id", employee_id)
    .single()

  const currentScore = scoreRow?.score ?? 50

  // 3️⃣ Calculate score boost
  const avg = (q1 + q2 + q3) / 3
  const boost = Math.round(avg * 5) // max 25
  const newScore = Math.min(100, currentScore + boost)

  // 4️⃣ Update engagement score + reset decay
  await supabase
    .from("engagement_scores")
    .update({
      score: newScore,
      risk_level: calculateRisk(newScore),
      updated_at: new Date().toISOString(),
    })
    .eq("employee_id", employee_id)

  return NextResponse.json({ success: true })
}
