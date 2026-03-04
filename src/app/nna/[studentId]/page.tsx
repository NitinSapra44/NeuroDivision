"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Home, Bell, User, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

// Matches what view_nna_dynamic_progress returns via get_nna_dashboard_overview
interface ProgressMetric {
  section_id: number
  section_name: string
  section_order: number
  section_progress_percentage: number
  dynamic_percentage: number
  has_star: boolean
  activities_attempted: number
  total_activities: number
}

interface StudentInfo {
  first_name: string
  last_name: string
}

interface DashboardData {
  student: StudentInfo
  view_mode: "REDIRECT" | "DASHBOARD_VIEW"
  redirect_url?: string
  permissions: {
    can_edit_profile: boolean
    can_view_activities: boolean
  }
  progress_metrics: ProgressMetric[]
}

export default function NnaStudentPage() {
  return (
    <ProtectedRoute>
      <NnaStudentContent />
    </ProtectedRoute>
  )
}

function NnaStudentContent() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string

  const { clearContext } = useAppContext()
  const chartRef = useRef<HTMLDivElement>(null)
  const [linePoints, setLinePoints] = useState("")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
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
    const fetchDashboard = async () => {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_nna_dashboard_overview", {
          p_nna_user_id: studentId,
        })
        if (rpcError) throw rpcError

        // If assessment is still pending, resume it immediately
        if (rpcData?.view_mode === "REDIRECT" && rpcData?.redirect_url) {
          setRedirecting(true)
          router.replace(rpcData.redirect_url)
          return
        }

        setData(rpcData)
        console.log(rpcData)
      } catch (err: any) {
        console.error(err)
        setError("No se pudo cargar el perfil del alumno.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [studentId, router])

  const metrics = (data?.progress_metrics ?? []) as ProgressMetric[]

  useEffect(() => {
    const calculate = () => {
      if (!chartRef.current || metrics.length < 2) return
      const container = chartRef.current
      const { height } = container.getBoundingClientRect()
      const bars = container.querySelectorAll<HTMLElement>("[data-bar]")
      if (bars.length === 0) return
      const containerRect = container.getBoundingClientRect()
      const pts = Array.from(bars).map(bar => {
        const r = bar.getBoundingClientRect()
        const x = r.left - containerRect.left + r.width / 2
        const y = r.top - containerRect.top
        return x.toFixed(1) + "," + y.toFixed(1)
      }).join(" ")
      setLinePoints(pts)
    }
    calculate()
    window.addEventListener("resize", calculate)
    return () => window.removeEventListener("resize", calculate)
  }, [metrics])

  if (loading || redirecting) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#ED3237]/30 border-t-[#ED3237] rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-white font-montserrat">
        <div className="text-center px-6">
          <p className="text-xl font-bold text-gray-800 mb-6">{error ?? "Sin datos"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#ED3237] text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-red-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const { student, permissions } = data

  // Colour palette for domain cards (cycles if more than 5 sections)
  const cardColors = [
    "bg-[#9B69C2]", "bg-[#BCA9CE]", "bg-[#A366FF]",
    "bg-[#5C66FF]", "bg-[#ED3237]",
  ]

  return (
    <section className="h-full flex flex-col bg-[#FEFEFE] font-montserrat overflow-x-hidden">
      <div className="flex w-full h-full flex-col md:flex-row">

        {/* ================= LEFT SIDEBAR ================= */}
        <div className="hidden md:flex w-[clamp(240px,18vw,300px)] flex-col items-center pt-6 border-r border-gray-100">

          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-[#ED3237] flex items-center justify-center shadow-sm">
            <User className="w-10 h-10 lg:w-14 lg:h-14 text-white" />
          </div>

          <h2 className="text-[#ED3237]  font-bold mt-4 tracking-tight">
            {student.first_name}
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
        <div className="flex-1 h-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-8 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          {/* MOBILE STARS — shown only on mobile */}
          {metrics.length > 0 && (
            <div className="flex md:hidden justify-center gap-6 mb-6 flex-wrap">
              {metrics.map((m) => (
                <div key={m.section_id} className="flex flex-col items-center">
                  <span className={m.has_star ? "text-[#ED3237] text-xl" : "text-gray-400 text-xl"}>★</span>
                  <p className="text-xs font-bold text-center mt-1">
                    {m.section_name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* GRAPH — dynamic_percentage per section */}
          {metrics.length > 0 && (
            <div className="flex justify-center mb-8 md:mb-12">
              <div className="w-full max-w-[820px] relative">
                <div
                  ref={chartRef}
                  className="h-32 sm:h-40 md:h-44 border-l-[1.5px] border-b-[1.5px] border-black/40 flex items-end justify-between px-[clamp(16px,3vw,80px)] relative"
                >
                  {metrics.map((m) => (
                    <div key={m.section_id} className="flex flex-col items-center justify-end h-full z-10">
                      <div
                        data-bar
                        className="w-4 sm:w-6 md:w-7 bg-[#A5B4FC] transition-all"
                        style={{ height: `${m.dynamic_percentage}%` }}
                      />
                      <span className="absolute -bottom-7 text-[10px] sm:text-xs font-bold text-gray-500">
                        {m.section_name.slice(0, 2)}
                      </span>
                    </div>
                  ))}

                  {/* SVG connecting line */}
                  {linePoints && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 20 }}>
                      <polyline
                        points={linePoints}
                        fill="none"
                        stroke="#CCCCCC"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* {linePoints.split(" ").map((pt, idx) => {
                        const [x, y] = pt.split(",").map(Number)
                        return <circle key={idx} cx={x} cy={y} r="4" fill="#CCCCCC" />
                      })} */}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DOMAIN CARDS GRID */}
          {metrics.length === 0 ? (
            <p className="text-center text-gray-500 text-lg mt-10">No hay actividades asignadas aún.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,2vw,48px)] mt-8 md:mt-0">
              {metrics.map((m, index) => (
                <button
                  key={m.section_id}
                  onClick={() =>
                    permissions.can_view_activities &&
                    router.push(`/nna/${studentId}/activities?section_id=${m.section_id}&section_name=${encodeURIComponent(m.section_name)}`)
                  }
                  disabled={!permissions.can_view_activities}
                  className="flex flex-col items-center disabled:opacity-40 disabled:cursor-not-allowed group transition-transform"
                >
                  <div
                    className={`w-full h-24 sm:h-32 md:h-40 rounded-[20px] border-[3.5px] border-black transition-transform group-hover:scale-[1.03] group-hover:shadow-lg ${cardColors[index % cardColors.length]}`}
                  />
                  <div className="w-full h-5 sm:h-6 md:h-7 bg-black mt-2 md:mt-3 relative overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-[#F5D14E] transition-all"
                      style={{ width: `${m.section_progress_percentage}%` }}
                    />
                  </div>
                  <h3 className="text-[clamp(20px,1.8vw,36px)] mt-2 md:mt-3 font-light text-black leading-none">
                    {m.section_name}
                  </h3>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* ================= RIGHT ICONS — desktop only ================= */}
        <div className="hidden md:flex w-[clamp(70px,6vw,100px)] flex-col items-center pt-12 space-y-12">
          <button onClick={() => router.push("/dashboard")}>
            <Home className="w-12 h-12 text-black stroke-[1.5]" />
          </button>
          <Bell className="w-12 h-12 text-black stroke-[1.5]" />
          <User className="w-12 h-12 text-black stroke-[1.5]" />
          <button onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="w-12 h-12 text-black stroke-[1.5]" />
          </button>
        </div>

      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t border-gray-200 flex justify-around items-center z-20">
        <button onClick={() => router.push("/dashboard")}>
          <Home className="w-6 h-6 text-black" />
        </button>
        <Bell className="w-6 h-6 text-black" />
        <User className="w-6 h-6 text-black" />
        <button onClick={handleLogout} disabled={loggingOut}>
          <LogOut className="w-6 h-6 text-black" />
        </button>
      </div>

    </section>
  )
}
