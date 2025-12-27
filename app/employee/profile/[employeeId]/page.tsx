'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Employee {
  id: string
  name: string
  email?: string
  department?: string
  role?: string
  // Add other fields as needed based on your Supabase schema
}

export default function EmployeeProfile() {
  const params = useParams()
  const employeeId = params.employeeId as string
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    console.log("✅ NEW EMPLOYEE PROFILE ROUTE", employeeId)

    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (error || !data) {
        router.push('/employees')
        return
      }

      setEmployee(data)
    }

    fetchEmployee()
  }, [employeeId, router])

  if (!employee) return <div>Loading...</div>

  return (
    <div>
      <h1>Employee Profile</h1>
      <p>ID: {employee.id}</p>
      <p>Name: {employee.name}</p>
      {employee.email && <p>Email: {employee.email}</p>}
      {employee.department && <p>Department: {employee.department}</p>}
      {employee.role && <p>Role: {employee.role}</p>}
    </div>
  )
}