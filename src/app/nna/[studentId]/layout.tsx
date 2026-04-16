"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Home, Bell, User, LogOut, Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import PageLoader from "@/components/ui/PageLoader"
import { NnaContext, ProgressMetric, StudentInfo, NnaPermissions } from "./NnaContext"

function NnaLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const { clearContext } = useAppContext()

  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [metrics, setMetrics] = useState<ProgressMetric[]>([])
  const [permissions, setPermissions] = useState<NnaPermissions | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.rpc("get_nna_dashboard_overview", {
        p_nna_user_id: studentId,
      })
      if (error) throw error

      if (data?.view_mode === "REDIRECT" && data?.redirect_url) {
        router.replace(data.redirect_url)
        return
      }

      setStudent(data.student)
      setMetrics(data.progress_metrics ?? [])
      setPermissions(data.permissions ?? null)
    } catch (err) {
      console.error("Failed to load student data:", err)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      clearContext()
      router.push("/login")
    } catch (err) {
      console.error(err)
    } finally {
      setLoggingOut(false)
    }
  }

  if (dataLoading) return <PageLoader />

  return (
    <NnaContext.Provider value={{ student, metrics, permissions, dataLoading, refreshMetrics: fetchData }}>
      <section className="min-h-screen flex flex-col bg-[#F2F2F2] font-montserrat overflow-x-hidden">
        <div className="flex w-full flex-1 flex-col md:flex-row">

          {/* ===== LEFT SIDEBAR — desktop ===== */}
          <div className="hidden md:flex w-[clamp(160px,14vw,220px)] flex-col items-center pt-6 border-r border-gray-100 shrink-0">
            {student?.institution_name && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-gray-100 rounded-lg max-w-[90%]">
                <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-gray-600 text-xs font-semibold truncate">{student.institution_name}</span>
              </div>
            )}
            <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-[#ED3237] flex items-center justify-center shadow-sm">
              <User className="w-10 h-10 lg:w-14 lg:h-14 text-white" />
            </div>
            <h2 className="text-[#ED3237] font-bold mt-4 tracking-tight text-center px-2">
              {student?.first_name ?? ""}
            </h2>
            <div className="mt-10 w-full px-4">
              <div className="flex flex-col gap-0 space-y-8">
                {metrics.map((m) => (
                  <div key={m.section_id} className="flex flex-col items-center">
                    <span className={`text-4xl leading-none ${m.has_star ? "text-[#ED3237]" : "text-gray-400"}`}>★</span>
                    <p className={`text-[10px] sm:text-xs font-bold mt-1 uppercase tracking-tighter text-center ${m.has_star ? "text-[#ED3237]" : "text-gray-600"}`}>
                      {m.section_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== MAIN CONTENT (children) ===== */}
          <div className="flex-1 h-full overflow-auto overflow-x-hidden">
            {children}
          </div>

          {/* ===== RIGHT SIDEBAR — desktop ===== */}
          <div className="hidden md:flex flex-col gap-8 items-center pt-16 px-4 shrink-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:scale-110 active:scale-95 transition-all duration-200"
              title="Inicio"
            >
              <Home className="w-12 h-12 text-black" />
            </button>
            <button className="opacity-40 cursor-not-allowed" title="Notificaciones (próximamente)" disabled>
              <Bell className="w-12 h-12 text-black" />
            </button>
            <button className="opacity-40 cursor-not-allowed" title="Opciones de usuario (próximamente)" disabled>
              <User className="w-12 h-12 text-black" />
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cerrar sesión"
            >
              <LogOut className="w-12 h-12 text-black" />
            </button>
          </div>

        </div>

        {/* ===== MOBILE BOTTOM NAV ===== */}
        <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t border-gray-200 flex justify-around items-center z-20">
          <button onClick={() => router.push("/dashboard")} className="hover:scale-110 transition-transform">
            <Home className="w-6 h-6 text-black" />
          </button>
          <button disabled className="opacity-40 cursor-not-allowed">
            <Bell className="w-6 h-6 text-black" />
          </button>
          <button disabled className="opacity-40 cursor-not-allowed">
            <User className="w-6 h-6 text-black" />
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="hover:scale-110 transition-transform disabled:hover:scale-100"
          >
            <LogOut className="w-6 h-6 text-black" />
          </button>
        </div>

      </section>
    </NnaContext.Provider>
  )
}

export default function NnaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <NnaLayoutContent>{children}</NnaLayoutContent>
    </ProtectedRoute>
  )
}
