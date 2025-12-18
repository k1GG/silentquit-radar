import { ProtectedRoute } from "@/components/ProtectedRoute"
import { EmployeesClient } from "@/components/EmployeesClient"

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <EmployeesClient />
    </ProtectedRoute>
  )
}
