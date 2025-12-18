"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // 🔹 Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/dashboard"
      }
    })
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setMessage("")
  
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email for the login link.")
    }
  
    setLoading(false)
  }
  
  return (
    <div className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold text-center">Login</h1>

      <Input
        type="email"
        placeholder="Enter your work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button
        onClick={handleLogin}
        disabled={loading || !email}
        className="w-full"
      >
        {loading ? "Sending link..." : "Send magic link"}
      </Button>

      {message && (
        <p className="text-sm text-center text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}
