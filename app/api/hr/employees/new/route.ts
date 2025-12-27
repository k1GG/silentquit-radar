import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 REQUIRED
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, position, department, join_date } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Update employee row created earlier by auth
    const { error } = await supabaseAdmin
      .from("employees")
      .update({
        name,
        position,
        department,
        join_date,
      })
      .eq("email", email)

    if (error) {
      console.error("UPDATE ERROR:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("SERVER ERROR:", err)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
