'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

const ALLOWED_STATUSES = ['present', 'absent', 'wfh', 'leave'] as const

type UploadResult = {
  inserted: number
  skipped: number
}

export async function uploadAttendanceCsv(formData: FormData): Promise<UploadResult> {
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
  const expectedHeaders = ['employee_email', 'attendance_date', 'status']
  
  for (const expectedHeader of expectedHeaders) {
    if (!headers.includes(expectedHeader)) {
      throw new Error(`Missing required header: ${expectedHeader}`)
    }
  }

  const employeeEmailIndex = headers.indexOf('employee_email')
  const attendanceDateIndex = headers.indexOf('attendance_date')
  const statusIndex = headers.indexOf('status')

  let inserted = 0
  let skipped = 0

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = line.split(',').map(v => v.trim())
      
      if (values.length < 3) {
        skipped++
        continue
      }

      const employeeEmail = values[employeeEmailIndex]
      const attendanceDateStr = values[attendanceDateIndex]
      const status = values[statusIndex].toLowerCase()

      // Validate email
      if (!employeeEmail || !employeeEmail.includes('@')) {
        skipped++
        continue
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(attendanceDateStr)) {
        skipped++
        continue
      }

      // Validate status
      if (!ALLOWED_STATUSES.includes(status as any)) {
        skipped++
        continue
      }

      // Resolve employee_id from email
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', employeeEmail)
        .single()

      if (employeeError || !employee) {
        skipped++
        continue
      }

      // Upsert attendance record
      const { error: upsertError } = await supabase
        .from('employee_attendance')
        .upsert({
          employee_id: employee.id,
          attendance_date: attendanceDateStr,
          status: status,
          uploaded_by: session.user.id
        }, {
          onConflict: 'employee_id,attendance_date'
        })

      if (upsertError) {
        skipped++
        continue
      }

      inserted++

    } catch (error) {
      // Skip malformed rows silently
      skipped++
      continue
    }
  }

  console.log(`Attendance upload completed: ${inserted} inserted, ${skipped} skipped`)

  // Revalidate relevant paths
  revalidatePath('/hr/dashboard/engagevalue')

  return {
    inserted,
    skipped
  }
}