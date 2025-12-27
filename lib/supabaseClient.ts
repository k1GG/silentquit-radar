import { createBrowserClient } from "@supabase/auth-helpers-nextjs"

console.log(
    "Supabase URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
