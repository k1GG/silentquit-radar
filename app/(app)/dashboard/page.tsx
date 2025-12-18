import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
