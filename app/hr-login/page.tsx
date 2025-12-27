"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function HrLoginPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    console.log("HR LOGIN RESULT: Error:", error)

    if (error) {
      console.log("HR LOGIN ERROR:", error)
      setError(error.message)
    } else {
      console.log("HR LOGIN SUCCESS: Magic link sent to", email)
      setMessage("Check your email for the magic link")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">HR Login</h1>
        <p className="text-sm text-center text-gray-600">
          Enter your email to receive a magic link
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-center text-red-600">
            {error}
          </p>
        )}

        {message && (
          <p className="text-sm text-center text-green-600">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}