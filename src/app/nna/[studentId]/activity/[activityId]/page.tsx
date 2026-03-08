"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Home, Bell, User, LogOut, CornerUpLeft, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import ResponseModal from "@/components/ui/ResponseModal"
import YouTubeEmbed, { VideoPlaceholder } from "@/components/ui/YouTubeEmbed"

// Matches view_nna_activity_detail returned by get_nna_activity_detail
interface ActivityDetail {
  activity_id: number
  program_id: number
  enrollment_id: number
  instruction: string
  video_url: string | null
  question: string
  objetive_specific: string
  is_success: boolean | null
  result_id: number | null
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

export default function ActivityPage() {
  return (
    <ProtectedRoute>
      <ActivityContent />
    </ProtectedRoute>
  )
}

function ActivityContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const activityId = Number(params.activityId)
  const sectionId = searchParams.get("section_id") ?? ""
  const sectionName = searchParams.get("section_name") ?? ""

  const { clearContext } = useAppContext()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [metrics, setMetrics] = useState<ProgressMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resultType, setResultType] = useState<"logrado" | "porLograr" | null>(null)
  const [buttonsBlocked, setButtonsBlocked] = useState(false)

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
    const fetchAll = async () => {
      try {
        const [activityRes, dashboardRes] = await Promise.all([
          supabase.rpc("get_nna_activity_detail", {
            p_nna_user_id: studentId,
            p_activity_id: activityId,
          }),
          supabase.rpc("get_nna_dashboard_overview", {
            p_nna_user_id: studentId,
          }),
        ])
        if (activityRes.error) throw activityRes.error
        setActivity(activityRes.data)
        if (!dashboardRes.error && dashboardRes.data) {
          setStudent(dashboardRes.data.student)
          setMetrics(dashboardRes.data.progress_metrics ?? [])
        }
      } catch (err: any) {
        console.error(err)
        setError("No se pudo cargar la actividad.")
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [studentId, activityId])

  const handleResultSelect = async (type: "logrado" | "porLograr") => {
    if (buttonsBlocked) return
    setResultType(type)
    setButtonsBlocked(true)
    setSaving(true)
    setError(null)
    try {
      const { error: submitError } = await supabase.rpc("save_activity_result", {
        p_nna_user_id: studentId,
        p_activity_id: activityId,
        p_result: type === "logrado",
      })
      if (submitError) throw submitError
      setModalOpen(true)
    } catch (err: any) {
      console.error(err)
      setError("Error al guardar. Intente nuevamente.")
      setButtonsBlocked(false)
    } finally {
      setSaving(false)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setButtonsBlocked(false)
  }

  const handleGoNext = async () => {
    setNavigating(true)
    setError(null)
    try {
      const { data: nextId, error: nextError } = await supabase.rpc("get_next_section_activity", {
        p_nna_user_id: studentId,
        p_current_activity_id: activityId,
      })
      if (nextError) throw nextError

      setModalOpen(false)

      if (nextId) {
        router.push(`/nna/${studentId}/activity/${nextId}?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`)
      } else {
        router.push(`/nna/${studentId}/activities?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`)
      }
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      console.error(err)
      setError("Error al avanzar. Intente nuevamente.")
      setModalOpen(false)
    } finally {
      setNavigating(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#ED3237]/30 border-t-[#ED3237] rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !activity) {
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

  // Button visual state: prefer local selection, fall back to saved result
  const isLogrado = resultType === "logrado" || (resultType === null && activity?.is_success === true)
  const isPorLograr = resultType === "porLograr" || (resultType === null && activity?.is_success === false)

  return (
    <section className="h-full flex flex-col bg-[#F2F2F2] font-montserrat overflow-x-hidden ">
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
        <div className="flex-1 h-full w-full px-[clamp(16px,3vw,60px)] pt-6 md:pt-12 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          {/* Desktop header */}
          <div className="hidden md:flex relative items-center justify-center mb-10">
            <div className="absolute left-0 flex items-center gap-6">
              <button onClick={() => router.push(`/nna/${studentId}`)} className="hover:scale-110 transition-transform">
                <Home className="w-8 h-8 md:w-10 md:h-10 text-[#000000]" />
              </button>
              <button onClick={() => router.push(`/nna/${studentId}/activities?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`)} className="hover:scale-110 transition-transform">
                <CornerUpLeft className="w-8 h-8 md:w-10 md:h-10 text-[#000000]" />
              </button>
            </div>
            <h1 className="text-[clamp(24px,2.5vw,48px)] font-bold">
              Actividad
            </h1>
          </div>

          {/* Mobile: nav + student name + stars */}
          <div className="flex md:hidden items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push(`/nna/${studentId}`)} className="hover:scale-110 transition-transform">
                <Home className="w-7 h-7 text-black" />
              </button>
              <button onClick={() => router.push(`/nna/${studentId}/activities?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`)} className="hover:scale-110 transition-transform">
                <CornerUpLeft className="w-7 h-7 text-black" />
              </button>
            </div>
            {student && <p className="text-[#ED3237] font-bold text-lg">{student.first_name}</p>}
            <div className="w-14" />
          </div>
          {metrics.length > 0 && (
            <div className="flex md:hidden justify-center gap-4 flex-wrap mb-4">
              {metrics.map((m) => (
                <div key={m.section_id} className="flex flex-col items-center">
                  <span className={m.has_star ? "text-[#ED3237] text-xl" : "text-gray-400 text-xl"}>★</span>
                  <p className="text-xs font-bold text-center mt-1">{m.section_name}</p>
                </div>
              ))}
            </div>
          )}

          {/* VIDEO + TEXT — video smaller on desktop, text gets remaining space */}
          <div className="flex flex-col md:flex-row gap-[clamp(16px,2vw,40px)] items-stretch">

            {/* VIDEO BOX */}
            <div className="w-full md:w-[38%] lg:w-[50%] h-56 md:h-72 lg:h-80 bg-[#ED3237] rounded-2xl border-[3px] border-black flex items-center justify-center overflow-hidden shrink-0">
              {activity?.video_url ? (
                <YouTubeEmbed url={activity.video_url} />
              ) : (
                <VideoPlaceholder />
              )}
            </div>

            {/* RIGHT TEXT BLOCK */}
            <div className="w-full md:flex-1 mt-4 md:mt-0 flex flex-col justify-start gap-4 md:gap-6">

              <div>
                <h2 className="text-[clamp(14px,1.1vw,20px)] font-bold mb-1 md:mb-2 text-right uppercase">
                  Objetivo:
                </h2>
                <p className="text-gray-700 text-[clamp(13px,0.95vw,17px)] leading-relaxed">
                  {activity?.objetive_specific}
                </p>
              </div>

              <div>
                <h2 className="text-[clamp(14px,1.1vw,20px)] font-bold mb-1 md:mb-2 text-right uppercase">
                  Instrucciones:
                </h2>
                <p className="text-gray-700 text-[clamp(13px,0.95vw,17px)] leading-relaxed">
                  {activity?.instruction}
                </p>
              </div>

            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-6 bg-red-100 border border-red-300 rounded-xl px-6 py-4 text-red-800 font-semibold text-center">
              {error}
            </div>
          )}

          {/* QUESTION + RESPONSE BUTTONS */}
          <div className="mt-8 md:mt-12">
            <p className="text-[clamp(15px,1.1vw,20px)] text-gray-800 mb-5 text-center">
              {activity?.question ?? "¿Es capaz de realizar al menos el 50% de la actividad de manera acertada?"}
            </p>

            {/* LOGRADO / POR LOGRAR — equal width, side by side */}
            <div className="flex gap-6 max-w-sm mx-auto w-full">
              <button
                onClick={() => handleResultSelect("logrado")}
                disabled={saving || buttonsBlocked}
                className={`flex-1 h-14 text-white text-base font-bold rounded-full border-[3px] border-black transition hover:scale-[1.04] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 ${
                  isLogrado ? "bg-[#80C342]" : "bg-[#848688] hover:bg-[#80C342]"
                }`}
              >
                {saving && resultType === "logrado" ? "Guardando..." : "Logrado"}
              </button>

              <button
                onClick={() => handleResultSelect("porLograr")}
                disabled={saving || buttonsBlocked}
                className={`flex-1 h-14 text-white text-base font-bold rounded-full border-[3px] border-black transition hover:scale-[1.04] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 ${
                  isPorLograr ? "bg-[#F02E2E]" : "bg-[#848688] hover:bg-[#F02E2E]"
                }`}
              >
                {saving && resultType === "porLograr" ? "Guardando..." : "Por lograr"}
              </button>

                <button
                onClick={handleGoNext}
                disabled={navigating}
                className="flex-1 flex items-center justify-center gap-1 h-14 text-base font-bold text-[#848688] underline transition hover:scale-[1.04] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100"
              >
                {navigating ? "Cargando..." : <> Siguiente <ArrowRight className="w-5 h-5 text-[#848688]" /></>}
              </button>
            </div>

            {/* SIGUIENTE ACTIVIDAD — visible whenever an answer has been given and modal is closed */}
            {/* {(isLogrado || isPorLograr) && !modalOpen && (
              <button
                onClick={handleGoNext}
                disabled={navigating}
                className="mt-4 w-full h-[clamp(56px,4vw,72px)] bg-[#ED3237] text-white text-[clamp(1.1rem,1.4vw,1.6rem)] font-extrabold rounded-full border-4 border-black shadow-lg hover:scale-[1.01] hover:shadow-xl transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {navigating ? "Cargando..." : "Siguiente actividad"}
              </button>
            )} */}
          </div>

        </div>

        {/* ================= RIGHT ICONS — desktop ================= */}
        <div className="hidden md:flex w-[clamp(70px,6vw,100px)] flex-col items-center pt-16 space-y-16 shrink-0">
          <div className="hover:scale-110 transition-transform"><Bell className="w-12 h-12 text-black" /></div>
          <div className="hover:scale-110 transition-transform"><User className="w-12 h-12 text-black" /></div>
          <button onClick={handleLogout} disabled={loggingOut} className="hover:scale-110 transition-transform disabled:hover:scale-100">
            <LogOut className="w-12 h-12 text-black" />
          </button>
        </div>

      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t flex justify-around items-center z-20">
        <Bell className="w-6 h-6 text-black" />
        <User className="w-6 h-6 text-black" />
        <button onClick={handleLogout} disabled={loggingOut} className="hover:scale-110 transition-transform disabled:hover:scale-100">
          <LogOut className="w-6 h-6 text-black" />
        </button>
      </div>

      <ResponseModal
        open={modalOpen}
        type={resultType ?? "logrado"}
        onClose={handleModalClose}
        onBack={() => router.push(`/nna/${studentId}`)}
        onConfirm={handleGoNext}
        confirming={navigating}
      />

    </section>
  )
}
