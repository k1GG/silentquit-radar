import { NextResponse } from "next/server"
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { Resend } from 'resend'

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
      .select("role, employee_id, company_id")
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

    // Fetch last 3 surveys and calculate risk
    const { data: surveys, error: fetchError } = await supabase
      .from('engagement_surveys')
      .select('q1,q2,q3,q4,q5,created_at')
      .eq('employee_id', profile.employee_id)
      .order('created_at', { ascending: false })
      .limit(3)

    if (fetchError) {
      console.log("FETCH SURVEYS ERROR:", fetchError)
    }

    let alertRiskLevel = 'LOW'
    if (surveys && surveys.length > 0) {
      surveys.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const scores = surveys.map(s => {
        const avg = (s.q1 + s.q2 + s.q3 + s.q4 + s.q5) / 5
        return Math.round(avg * 20)
      })
      const latest_score = scores[scores.length - 1]
      let prev_score = scores.length >= 2 ? scores[scores.length - 2] : null
      let drop = prev_score !== null ? prev_score - latest_score : 0
      alertRiskLevel = 'LOW'
      if ((latest_score < 40 && prev_score !== null && prev_score < 40) || drop >= 15) {
        alertRiskLevel = 'HIGH'
      } else if (latest_score >= 40 && latest_score <= 55) {
        alertRiskLevel = 'MEDIUM'
      }
      let reason = ''
      if (alertRiskLevel === 'HIGH') {
        reason = drop >= 15 ? `Engagement dropped by ${drop} points since last survey` : 'Sustained low engagement across surveys'
      } else if (alertRiskLevel === 'MEDIUM') {
        reason = 'Below healthy engagement threshold'
      }
      console.log("RISK CALCULATED:", profile.employee_id, alertRiskLevel, reason, "drop:", drop)

      const shouldSendEmail = alertRiskLevel === 'HIGH' || drop >= 20
      console.log("EMAIL TRIGGER CONDITION MET:", shouldSendEmail)

      // Insert or update risk alert
      const { data: existingAlert, error: alertError } = await supabase
        .from('risk_alerts')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(1)
      if (alertError) {
        console.log("FETCH ALERT ERROR:", alertError)
      }
      let alertId
      if (existingAlert && existingAlert.length > 0) {
        const { error: updateError } = await supabase
          .from('risk_alerts')
          .update({
            risk_level: alertRiskLevel.toLowerCase(), // Normalize to lowercase for DB constraint
            reason,
            score_at_alert: latest_score
          })
          .eq('employee_id', profile.employee_id)
          .eq('resolved', false)
        if (updateError) {
          console.log("UPDATE ALERT ERROR:", updateError)
        }
        alertId = existingAlert[0].id
      } else {
        const { data: alert, error: insertAlertError } = await supabase
          .from('risk_alerts')
          .insert({
            employee_id: profile.employee_id,
            risk_level: alertRiskLevel.toLowerCase(), // Normalize to lowercase for DB constraint
            reason,
            score_at_alert: latest_score,
            created_at: new Date().toISOString(),
            resolved: false,
            email_sent: false
          })
          .select()
          .single()
        if (insertAlertError) {
          console.log("INSERT ALERT ERROR:", insertAlertError)
        }
        alertId = alert.id
      }

      let emailSent = false
      if (shouldSendEmail) {
        // Fetch HR email
        const { data: hrProfile, error: hrError } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', 'hr')
          .eq('company_id', profile.company_id)
          .single()

        console.log("HR EMAIL FETCH:", hrProfile?.email, "ERROR:", hrError)

        if (hrError || !hrProfile?.email) {
          console.log("HR email not found, skipping notification")
        } else {
          const hrEmail = hrProfile.email
          console.log("RESOLVED HR EMAIL:", hrEmail)

          const { data: employeeData, error: empError } = await supabase
            .from('employees')
            .select('name, email, department')
            .eq('id', profile.employee_id)
            .single()

          if (empError || !employeeData) {
            console.log("Employee fetch error for email:", empError)
          } else if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY)
            try {
              const emailResponse = await resend.emails.send({
                from: 'HR Alerts <onboarding@resend.dev>',
                to: hrEmail,
                subject: `${alertRiskLevel} Risk Alert for Employee`,
                html: `<p><strong>Employee Name:</strong> ${employeeData.name}</p>
                       <p><strong>Employee Email:</strong> ${employeeData.email}</p>
                       <p><strong>Department:</strong> ${employeeData.department}</p>
                       <p><strong>Risk Level:</strong> ${alertRiskLevel}</p>
                       <p><strong>Risk Reason:</strong> ${reason}</p>
                       <p><strong>Score Delta:</strong> ${drop}</p>`
              })
              console.log("RESEND RESPONSE DATA:", emailResponse.data)
              console.log("RESEND RESPONSE ERROR:", emailResponse.error)
              if (!emailResponse.error) {
                emailSent = true
                console.log("EMAIL SENT SUCCESSFULLY")
              } else {
                console.log("EMAIL FAILED (non-blocking):", emailResponse.error)
              }
            } catch (emailError) {
              console.log("EMAIL FAILED (non-blocking):", emailError)
            }
          } else {
            console.log("RESEND_API_KEY not configured, skipping email notification")
          }
        }
      }

      if (emailSent) {
        await supabase
          .from("risk_alerts")
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq("id", alertId)

        console.log("ALERT MARKED AS EMAILED:", alertId)
      }
    }

    // Calculate and store engagement score
    const average = (q1 + q2 + q3 + q4 + q5) / 5
    const score = Math.round(average * 20)
    let scoreRiskLevel = "High"
    if (score >= 80) scoreRiskLevel = "Low"
    else if (score >= 60) scoreRiskLevel = "Medium"

    const { error: scoreError } = await supabase
      .from("engagement_scores")
      .insert({
        employee_id: profile.employee_id,
        score,
        risk_level: scoreRiskLevel,
        created_at: new Date().toISOString(),
      })

    if (scoreError) {
      console.log("SCORE INSERT FAILURE:", scoreError)
      // Don't fail the request if score insert fails, but log it
    } else {
      console.log("SCORE INSERT SUCCEEDS:", score, scoreRiskLevel)
    }


    return NextResponse.json({ success: true })

  } catch (e) {
    console.error("SERVER ERROR:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}