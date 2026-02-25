"use server"

import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"

export type UploadResult = {
  success: boolean
  processed: number
}

const VALID_STATUSES = ["present", "absent", "wfh", "leave"]

export async function uploadAttendanceCsv(
  formData: FormData
): Promise<UploadResult> {
  const supabase = await createSupabaseServerClient()

  const file = formData.get("file") as File
  if (!file) {
    throw new Error("No file uploaded")
  }

  const text = await file.text()
  const lines = text.trim().split("\n")

  if (lines.length < 2) {
    return { success: true, processed: 0 }
  }

  const headers = lines[0].split(",").map(h => h.trim())

  const emailIndex = headers.indexOf("employee_email")
  const dateIndex = headers.indexOf("attendance_date")
  const statusIndex = headers.indexOf("status")

  if (emailIndex === -1) {
    throw new Error("Missing required header: employee_email")
  }
  if (dateIndex === -1) {
    throw new Error("Missing required header: attendance_date")
  }
  if (statusIndex === -1) {
    throw new Error("Missing required header: status")
  }

  const records: {
    employee_id: string
    attendance_date: string
    status: string
  }[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim())

    const employeeEmail = cols[emailIndex]
    const attendanceDate = cols[dateIndex]
    const status = cols[statusIndex]?.toLowerCase()

    if (!employeeEmail || !attendanceDate || !status) continue
    if (!VALID_STATUSES.includes(status)) continue

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("email", employeeEmail)
      .single()

    if (!employee) continue

    records.push({
      employee_id: employee.id,
      attendance_date: attendanceDate,
      status,
    })
  }

  if (records.length === 0) {
    return { success: true, processed: 0 }
  }

  const { data: inserted, error } = await supabase
    .from("engagement_attendance")
    .insert(records)
    .select()

  if (error) {
    console.error("Attendance insert error:", error)
    throw new Error("Attendance insert failed")
  }

  // Create timeline events for absences
  const absenceEvents =
    inserted
      ?.filter(r => r.status === "absent")
      .map(r => ({
        employee_id: r.employee_id,
        event_type: "attendance_absent",
        event_label: "Marked absent",
        event_date: r.attendance_date,
      })) || []

  if (absenceEvents.length > 0) {
    await supabase
      .from("engagement_events")
      .insert(absenceEvents)
  }

  revalidatePath("/hr/dashboard/attendance")

  return {
    success: true,
    processed: inserted?.length || 0,
  }
}
