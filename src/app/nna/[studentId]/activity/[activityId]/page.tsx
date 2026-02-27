"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Home, Bell, User, Play, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import ResponseModal from "@/components/ui/ResponseModal"

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resultType, setResultType] = useState<"logrado" | "porLograr">("logrado")

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_nna_activity_detail", {
          p_nna_user_id: studentId,
          p_activity_id: activityId,
        })
        if (rpcError) throw rpcError
        setActivity(data)
        console.log(data)
      } catch (err: any) {
        console.error(err)
        setError("No se pudo cargar la actividad.")
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [studentId, activityId])

  const handleResultSelect = (type: "logrado" | "porLograr") => {
    setResultType(type)
    setModalOpen(true)
  }

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      // submit_activity_result takes a boolean: true = logrado, false = por lograr
      const { error: submitError } = await supabase.rpc("submit_activity_result", {
        p_nna_user_id: studentId,
        p_activity_id: activityId,
        p_result: resultType === "logrado",
      })
      if (submitError) throw submitError

      // Find the next activity in this section
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
    } catch (err: any) {
      console.error(err)
      setError("Error al guardar. Intente nuevamente.")
      setModalOpen(false)
    } finally {
      setSaving(false)
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

  const backUrl = sectionId
    ? `/nna/${studentId}/activities?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`
    : `/nna/${studentId}`

  return (
    <section className="h-full flex flex-col bg-[#F2F2F2] font-montserrat overflow-x-hidden">
      <div className="flex w-full h-full flex-col md:flex-row">

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 h-full w-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-12 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          <div className="hidden md:flex relative items-center justify-center mb-10">
            <div className="absolute left-0">
              <button onClick={() => router.push(backUrl)}>
                <Home className="w-10 h-10 text-[#ED3237]" />
              </button>
            </div>
            <h1 className="text-[clamp(24px,2.5vw,48px)] font-bold">
              Actividad
            </h1>
          </div>

          {/* VIDEO + TEXT */}
          <div className="flex flex-col md:flex-row gap-[clamp(16px,2vw,48px)] items-start">

            {/* VIDEO BOX */}
            <div className="w-full md:flex-1 h-64 md:h-80 bg-[#ED3237] rounded-2xl border-[3px] border-black flex items-center justify-center overflow-hidden">
              {activity?.video_url ? (
                <video
                  src={activity.video_url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-28 h-28 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center">
                  <Play className="w-12 h-12 md:w-16 md:h-16 text-[#ED3237]" fill="#ED3237" />
                </div>
              )}
            </div>

            {/* RIGHT TEXT BLOCK */}
            <div className="w-full md:max-w-[420px] mt-6 md:mt-0">

              <h2 className="text-[clamp(16px,1.2vw,22px)] font-bold mb-2 md:mb-3 text-right">
                OBJETIVO:
              </h2>
              <p className="text-gray-700 text-[clamp(14px,1vw,18px)] leading-relaxed mb-6 md:mb-8">
                {activity?.objetive_specific}
              </p>

              <h2 className="text-[clamp(16px,1.2vw,22px)] font-bold mb-2 md:mb-3 text-right">
                INSTRUCCIONES:
              </h2>
              <p className="text-gray-700 text-[clamp(14px,1vw,18px)] leading-relaxed">
                {activity?.instruction}
              </p>

            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-6 bg-red-100 border border-red-300 rounded-xl px-6 py-4 text-red-800 font-semibold text-center">
              {error}
            </div>
          )}

          {/* QUESTION */}
          <div className="mt-12 md:mt-24 text-center">
            <p className="text-[clamp(16px,1.2vw,22px)] text-gray-800 mb-4">
              {activity?.question ?? "¿Es capaz de realizar al menos el 50% de la actividad de manera acertada?"}
            </p>

            <div className="flex justify-center gap-[clamp(16px,2vw,48px)] flex-wrap">
              <button
                onClick={() => handleResultSelect("logrado")}
                disabled={saving}
                className="h-[clamp(48px,3.5vw,64px)] px-[clamp(16px,2vw,40px)] bg-[#80C342] text-white text-[clamp(16px,1.2vw,22px)] font-bold rounded-full border-[3px] border-black disabled:opacity-50"
              >
                Logrado
              </button>
              <button
                onClick={() => handleResultSelect("porLograr")}
                disabled={saving}
                className="h-[clamp(48px,3.5vw,64px)] px-[clamp(16px,2vw,40px)] bg-[#848688] text-white text-[clamp(16px,1.2vw,22px)] font-bold rounded-full border-[3px] border-black disabled:opacity-50"
              >
                Por lograr
              </button>
            </div>
          </div>

        </div>

        {/* ================= RIGHT ICONS ================= */}
        <div className="hidden md:flex w-[clamp(70px,6vw,100px)] flex-col items-center pt-16 space-y-16">
          <button onClick={() => router.push("/dashboard")}>
            <Home className="w-12 h-12 text-black" />
          </button>
          <Bell className="w-12 h-12 text-black" />
          <User className="w-12 h-12 text-black" />
          <button onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="w-12 h-12 text-black" />
          </button>
        </div>

      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t flex justify-around items-center">
        <button onClick={() => router.push("/dashboard")}>
          <Home className="w-6 h-6 text-black" />
        </button>
        <Bell className="w-6 h-6 text-black" />
        <User className="w-6 h-6 text-black" />
        <button onClick={handleLogout} disabled={loggingOut}>
          <LogOut className="w-6 h-6 text-black" />
        </button>
      </div>

      <ResponseModal
        open={modalOpen}
        type={resultType}
        onClose={() => setModalOpen(false)}
      />

    </section>
  )
}
