"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function EmployeeLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("EMPLOYEE LOGIN RESULT:", data, error)

    if (error) {
      console.log("EMPLOYEE LOGIN ERROR:", error)
      setError(error.message)
      setLoading(false)
    } else {
      console.log("EMPLOYEE LOGIN SUCCESS:", data.user?.id)

      // Fetch employee_id from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, employee_id')
        .eq('id', data.user?.id)
        .single()

      console.log("EMPLOYEE PROFILE:", profile, "ERROR:", profileError)

      if (!profile || profile.role !== 'employee' || !profile.employee_id) {
        console.log("INVALID EMPLOYEE ACCOUNT: profile not found or invalid role")
        setError("Invalid employee account")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      console.log("EMPLOYEE ROLE VALIDATED:", profile.role)
      console.log("EMPLOYEE ID FETCHED:", profile.employee_id)

      // Redirect to employee dashboard
      router.push(`/employee/dashboard`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Employee Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-center text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}