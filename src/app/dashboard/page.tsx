"use client"

import { useAppContext } from "@/store/app-context"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import IndividualClientDashboard from "@/components/dashboard/IndividualClientDashboard"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col">
        <DashboardContent />
      </div>
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { permissions } = useAppContext()
  const viewType = permissions?.view_type

  switch (viewType) {
    case "individual_client_dashboard":
      return (
        <div className="flex-1">
          <IndividualClientDashboard />
        </div>
      )

    default:
      return (
        <div className="flex-1 flex items-center justify-center bg-black text-white overflow-x-hidden">
          <p className="text-[clamp(1.5rem,2vw,2.8rem)]">Tipo de vista desconocido: {viewType}</p>
        </div>
      )
  }
}
