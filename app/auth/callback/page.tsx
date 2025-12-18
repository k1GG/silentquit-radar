"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const finishLogin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.replace("/dashboard")
      } else {
        router.replace("/login")
      }
    }

    finishLogin()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      Completing login…
    </div>
  )
}
