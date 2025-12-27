import { NextResponse } from "next/server"
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 🔍 DEBUG START (ADD THIS)
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    console.log("AUTH USER:", user)
    console.log("AUTH ERROR:", authError)
    // 🔍 DEBUG END

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Authenticated user email:", user.email)

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, employee_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.log("profile fetch error:", profileError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("profile.role:", profile.role)
    console.log("profile.employee_id:", profile.employee_id)

    if (profile.role !== "employee" || !profile.employee_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { q1, q2, q3, q4, q5 } = body

    console.log("request body (ignoring employee_id):", body)

    console.log("Using authenticated employee_id:", profile.employee_id)

    const { error: insertError } = await supabase
      .from("engagement_surveys")
      .insert({
        employee_id: profile.employee_id,
        q1,
        q2,
        q3,
        q4,
        q5,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.log("SURVEY INSERT FAILURE:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("SURVEY INSERT SUCCEEDS")

    // Calculate and store engagement score
    const average = (q1 + q2 + q3 + q4 + q5) / 5
    const score = Math.round(average * 20)
    let risk_level = "High"
    if (score >= 80) risk_level = "Low"
    else if (score >= 60) risk_level = "Medium"

    const { error: scoreError } = await supabase
      .from("engagement_scores")
      .insert({
        employee_id: profile.employee_id,
        score,
        risk_level,
        created_at: new Date().toISOString(),
      })

    if (scoreError) {
      console.log("SCORE INSERT FAILURE:", scoreError)
      // Don't fail the request if score insert fails, but log it
    } else {
      console.log("SCORE INSERT SUCCEEDS:", score, risk_level)
    }

    return NextResponse.json({ success: true })

  } catch (e) {
    console.error("SERVER ERROR:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}