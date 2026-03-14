"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Home, Bell, User, LogOut } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import PageLoader from "@/components/ui/PageLoader"

// Matches view_nna_section_activities returned by get_nna_section_activities
interface Activity {
  activity_id: number
  is_success: boolean | null   // null = not attempted, true = logrado, false = por lograr
}

interface ProgressMetric {
  section_id: number
  section_name: string
  has_star: boolean
}

interface StudentInfo {
  first_name: string
  last_name: string
}

export default function ActivitiesPage() {
  return (
    <ProtectedRoute>
      <ActivitiesContent />
    </ProtectedRoute>
  )
}

function ActivitiesContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const sectionId = Number(searchParams.get("section_id"))
  const sectionName = searchParams.get("section_name") ?? "Sección"

  const { clearContext } = useAppContext()
  const [activities, setActivities] = useState<Activity[]>([])
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [metrics, setMetrics] = useState<ProgressMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

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

  useEffect(() => {
    if (!sectionId) {
      setError("Sección no especificada.")
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      try {
        const [activitiesRes, dashboardRes] = await Promise.all([
          supabase.rpc("get_nna_section_activities", {
            p_nna_user_id: studentId,
            p_section_id: sectionId,
          }),
          supabase.rpc("get_nna_dashboard_overview", {
            p_nna_user_id: studentId,
          }),
        ])
        if (activitiesRes.error) throw activitiesRes.error
        setActivities(activitiesRes.data ?? [])
        if (!dashboardRes.error && dashboardRes.data) {
          setStudent(dashboardRes.data.student)
          setMetrics(dashboardRes.data.progress_metrics ?? [])
        }
      } catch (err: any) {
        console.error(err)
        setError("No se pudieron cargar las actividades.")
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [studentId, sectionId])

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white font-montserrat">
        <div className="text-center px-6">
          <p className="text-xl font-bold text-gray-800 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/nna/${studentId}`)}
            className="bg-[#ED3237] text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-red-700 transition"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="h-full flex flex-col bg-[#F5F5F5] font-montserrat overflow-x-hidden">
      <div className="flex w-full h-full flex-col md:flex-row">

        {/* ================= LEFT SIDEBAR — desktop ================= */}
        <div className="hidden md:flex w-[clamp(200px,16vw,280px)] flex-col items-center pt-6 border-r border-gray-100 shrink-0">
          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-[#ED3237] flex items-center justify-center shadow-sm">
            <User className="w-10 h-10 lg:w-14 lg:h-14 text-white" />
          </div>
          <h2 className="text-[#ED3237] font-bold mt-4 tracking-tight">
            {student?.first_name ?? ""}
          </h2>
          <div className="mt-10 w-full px-4">
            <div className="flex flex-col gap-0 space-y-8">
              {metrics.map((m) => (
                <div key={m.section_id} className="flex flex-col items-center">
                  <span className={`text-4xl leading-none ${m.has_star ? "text-[#ED3237]" : "text-gray-400"}`}>★</span>
                  <p className={`text-[10px] sm:text-xs font-bold mt-1 uppercase tracking-tighter ${m.has_star ? "text-[#ED3237]" : "text-gray-600"}`}>
                    {m.section_name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 h-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-10 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          {/* Mobile: student name + stars */}
          {metrics.length > 0 && (
            <div className="flex md:hidden flex-col items-center mb-4">
              {student && <p className="text-[#ED3237] font-bold text-lg mb-2">{student.first_name}</p>}
              <div className="flex justify-center gap-4 flex-wrap">
                {metrics.map((m) => (
                  <div key={m.section_id} className="flex flex-col items-center">
                    <span className={m.has_star ? "text-[#ED3237] text-xl" : "text-gray-400 text-xl"}>★</span>
                    <p className="text-xs font-bold text-center mt-1">{m.section_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative flex items-center justify-center mb-8 md:mb-12">
            <div className="absolute left-0">
              <button onClick={() => router.push(`/nna/${studentId}`)} className="hover:scale-110 transition-transform">
                <Home className="w-8 h-8 md:w-12 md:h-12 text-[#ED3237]" />
              </button>
            </div>
            <h1 className="text-[clamp(18px,2.5vw,48px)] font-bold text-black text-center px-12">
              Actividades: {sectionName}
            </h1>
          </div>

          {activities.length === 0 ? (
            <p className="text-center text-gray-500 text-lg mt-10">No hay actividades en esta sección.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,2vw,48px)] justify-items-center">
              {activities.map((item) => {
                // spec: true -> green + "L" | false/null -> red + "PL"
                const isDone = item.is_success === true

                return (
                  <button
                    key={item.activity_id}
                    onClick={() => router.push(`/nna/${studentId}/activity/${item.activity_id}?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`)}
                    className="flex flex-col items-center w-full group"
                  >
                    <div
                      className={`w-full max-w-[288px] h-32 sm:h-36 md:h-40 rounded-[6px] border-[3px] border-black flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.03] group-hover:shadow-lg ${
                        isDone ? "bg-[#7BC043]" : "bg-[#F02E2E]"
                      }`}
                    >
                      <Image
                        src="/Vector.png"
                        alt="Rocket"
                        width={90}
                        height={90}
                        className="object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-[90px] md:h-[90px]"
                      />
                    </div>
                    <p className="text-[clamp(20px,1.8vw,36px)] mt-2 font-light">
                      {isDone ? "L" : "PL"}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

        </div>

        {/* ================= RIGHT ICONS — desktop only ================= */}
        <div className="hidden md:flex flex-col gap-8 items-center pt-16 px-4 shrink-0">
          <button onClick={() => router.push("/dashboard")} className="hover:scale-110 active:scale-95 transition-all duration-200" title="Inicio">
            <Home className="w-12 h-12 text-black" />
          </button>
          <button className="opacity-40 cursor-not-allowed" title="Notificaciones (próximamente)" disabled>
            <Bell className="w-12 h-12 text-black" />
          </button>
          <button className="opacity-40 cursor-not-allowed" title="Opciones de usuario (próximamente)" disabled>
            <User className="w-12 h-12 text-black" />
          </button>
          <button onClick={handleLogout} disabled={loggingOut} className="hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Cerrar sesión">
            <LogOut className="w-12 h-12 text-black" />
          </button>
        </div>

      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t border-gray-200 flex justify-around items-center z-20">
        <button onClick={() => router.push("/dashboard")} className="hover:scale-110 transition-transform">
          <Home className="w-6 h-6 text-black" />
        </button>
        <Bell className="w-6 h-6 text-black" />
        <User className="w-6 h-6 text-black" />
        <button onClick={handleLogout} disabled={loggingOut} className="hover:scale-110 transition-transform disabled:hover:scale-100">
          <LogOut className="w-6 h-6 text-black" />
        </button>
      </div>

    </section>
  )
}
