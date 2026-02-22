'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

const ALLOWED_STATUSES = ['present', 'absent', 'wfh', 'leave'] as const

type UploadResult = {
  processed: number
}

export async function uploadAttendanceAction(formData: FormData): Promise<UploadResult> {
  const supabase = await createSupabaseServerClient()

  // Verify HR role
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'hr') {
    throw new Error('Unauthorized')
  }

  // Get CSV file
  const file = formData.get('file') as File
  if (!file) {
    throw new Error('No file provided')
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only CSV files are allowed')
  }

  // Read and parse CSV
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least header and one data row')
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const expectedHeaders = ['employee_email', 'date', 'status']
  
  for (const expectedHeader of expectedHeaders) {
    if (!headers.includes(expectedHeader)) {
      throw new Error(`Missing required header: ${expectedHeader}`)
    }
  }

  const employeeEmailIndex = headers.indexOf('employee_email')
  const dateIndex = headers.indexOf('date')
  const statusIndex = headers.indexOf('status')

  let processed = 0
  const affectedEmployeeIds = new Set<string>()

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = line.split(',').map(v => v.trim())
      
      if (values.length < 3) {
        continue
      }

      const employeeEmail = values[employeeEmailIndex]
      const dateStr = values[dateIndex]
      const status = values[statusIndex].toLowerCase()

      // Validate email
      if (!employeeEmail || !employeeEmail.includes('@')) {
        continue
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(dateStr)) {
        continue
      }

      // Validate status
      if (!ALLOWED_STATUSES.includes(status as any)) {
        continue
      }

      // Resolve employee_id from email
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', employeeEmail)
        .single()

      if (employeeError || !employee) {
        continue
      }

      // Insert attendance record
      const { error: insertError } = await supabase
        .from('engagement_attendance')
        .insert({
          employee_id: employee.id,
          attendance_date: dateStr,
          status: status
        })

      if (insertError) {
        continue
      }

      processed++
      affectedEmployeeIds.add(employee.id)

    } catch (error) {
      continue
    }
  }

  // Calculate attendance % for last 30 days for each affected employee
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  for (const employeeId of affectedEmployeeIds) {
    // Fetch attendance for last 30 days
    const { data: attendanceData } = await supabase
      .from('engagement_attendance')
      .select('status')
      .eq('employee_id', employeeId)
      .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0])

    if (!attendanceData || attendanceData.length === 0) {
      continue
    }

    // Calculate attendance percentage (present / total)
    const presentCount = attendanceData.filter(a => a.status === 'present').length
    const attendancePercentage = (presentCount / attendanceData.length) * 100

    // If attendance < 70%, insert engagement event
    if (attendancePercentage < 70) {
      await supabase
        .from('engagement_events')
        .insert({
          employee_id: employeeId,
          event_type: 'attendance',
          event_label: 'Attendance dropped below 70%',
          event_date: today.toISOString().split('T')[0],
          severity: 'high'
        })
    }
  }

  console.log(`Attendance upload completed: ${processed} records processed`)

  // Revalidate relevant paths
  revalidatePath('/hr/dashboard/attendance')
  revalidatePath('/hr/employee')

  return {
    processed
  }
}
