"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Home, User, CornerUpLeft, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useNnaContext } from "../../NnaContext"
import PageLoader from "@/components/ui/PageLoader"
import ResponseModal from "@/components/ui/ResponseModal"
import YouTubeEmbed, { VideoPlaceholder } from "@/components/ui/YouTubeEmbed"

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
  return <ActivityContent />
}

function ActivityContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const activityId = Number(params.activityId)
  const sectionId = searchParams.get("section_id") ?? ""
  const sectionName = searchParams.get("section_name") ?? ""

  const { student, metrics } = useNnaContext()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resultType, setResultType] = useState<"logrado" | "porLograr" | null>(null)
  const [buttonsBlocked, setButtonsBlocked] = useState(false)

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_nna_activity_detail", {
          p_nna_user_id: studentId,
          p_activity_id: activityId,
        })
        if (rpcError) throw rpcError
        setActivity(data)
      } catch (err: any) {
        console.error(err)
        setError("No se pudo cargar la actividad.")
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
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

  if (loading) return <PageLoader />

  if (error && !activity) {
    return (
      <div className="h-full flex items-center justify-center font-montserrat">
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

  const isLogrado = resultType === "logrado" || (resultType === null && activity?.is_success === true)
  const isPorLograr = resultType === "porLograr" || (resultType === null && activity?.is_success === false)

  return (
    <div className="h-full px-[clamp(16px,3vw,60px)] pt-6 md:pt-12 pb-24 md:pb-8 overflow-auto overflow-x-hidden font-montserrat">

      {/* Avatar + name + stars — mobile only (left sidebar handles desktop) */}
      <div className="flex md:hidden flex-col items-center mb-6">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#ED3237] flex items-center justify-center shadow-sm mb-2">
          <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>
        {student && <p className="text-[#ED3237] font-bold text-lg mb-2">{student.first_name}</p>}
        {metrics.length > 0 && (
          <div className="flex justify-center gap-4 flex-wrap">
            {metrics.map((m) => (
              <div key={m.section_id} className="flex flex-col items-center">
                <span className={m.has_star ? "text-[#ED3237] text-xl" : "text-gray-400 text-xl"}>★</span>
                <p className="text-xs font-bold text-center mt-1">{m.section_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header with home + back + title */}
      <div className="relative flex items-center justify-center mb-8 md:mb-12">
        <div className="absolute left-0 hidden md:flex items-center gap-4">
          <button onClick={() => router.push(`/nna/${studentId}`)} className="hover:scale-110 transition-transform">
            <Home className="w-10 h-10 md:w-12 md:h-12 text-[#ED3237]" />
          </button>
          <button onClick={() => router.push(`/nna/${studentId}/activities?section_id=${sectionId}&section_name=${encodeURIComponent(sectionName)}`)} className="hover:scale-110 transition-transform">
            <CornerUpLeft className="w-10 h-10 md:w-12 md:h-12 text-[#ED3237]" />
          </button>
        </div>
        <h1 className="text-[clamp(18px,2.5vw,48px)] font-bold text-black text-center px-12">Actividad</h1>
      </div>

      {/* Mobile stars — now replaced by top section, kept for md:hidden breakpoint safety */}
      {metrics.length > 0 && (
        <div className="hidden justify-center gap-4 flex-wrap mb-4">
          {metrics.map((m) => (
            <div key={m.section_id} className="flex flex-col items-center">
              <span className={m.has_star ? "text-[#ED3237] text-xl" : "text-gray-400 text-xl"}>★</span>
              <p className="text-xs font-bold text-center mt-1">{m.section_name}</p>
            </div>
          ))}
        </div>
      )}

      {/* VIDEO + TEXT */}
      <div className="flex flex-col lg:flex-row gap-[clamp(16px,2vw,40px)] items-stretch">
        <div className="w-full lg:w-[48%] h-56 md:h-72 lg:h-80 bg-[#ED3237] rounded-2xl border-[3px] border-black flex items-center justify-center overflow-hidden shrink-0">
          {activity?.video_url ? (
            <YouTubeEmbed url={activity.video_url} />
          ) : (
            <VideoPlaceholder />
          )}
        </div>

        <div className="w-full md:flex-1 mt-4 md:mt-0 flex flex-col justify-start gap-4 md:gap-6">
          <div>
            <h2 className="text-[clamp(14px,1.1vw,20px)] font-bold mb-1 md:mb-2 text-right uppercase">Objetivo:</h2>
            <p className="text-gray-700 text-[clamp(13px,0.95vw,17px)] leading-relaxed">{activity?.objetive_specific}</p>
          </div>
          <div>
            <h2 className="text-[clamp(14px,1.1vw,20px)] font-bold mb-1 md:mb-2 text-right uppercase">Instrucciones:</h2>
            <p className="text-gray-700 text-[clamp(13px,0.95vw,17px)] leading-relaxed">{activity?.instruction}</p>
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

        {/* Logrado / Por lograr / Siguiente — wider container, min-width per button */}
        <div className="flex gap-4 max-w-lg mx-auto w-full">
          <button
            onClick={() => handleResultSelect("logrado")}
            disabled={saving || buttonsBlocked}
            className={`flex-1 min-w-[100px] h-14 text-white text-base font-bold rounded-full border-[3px] border-black transition hover:scale-[1.04] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 ${
              isLogrado ? "bg-[#80C342]" : "bg-[#848688] hover:bg-[#80C342]"
            }`}
          >
            {saving && resultType === "logrado" ? "Guardando..." : "Logrado"}
          </button>

          <button
            onClick={() => handleResultSelect("porLograr")}
            disabled={saving || buttonsBlocked}
            className={`flex-1 min-w-[100px] h-14 text-white text-base font-bold rounded-full border-[3px] border-black transition hover:scale-[1.04] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 ${
              isPorLograr ? "bg-[#F02E2E]" : "bg-[#848688] hover:bg-[#F02E2E]"
            }`}
          >
            {saving && resultType === "porLograr" ? "Guardando..." : "Por lograr"}
          </button>

          {/* Siguiente: color-change hover instead of underline+scale */}
          <button
            onClick={handleGoNext}
            disabled={navigating}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1 h-14 text-base font-bold text-[#848688] transition-colors hover:text-black disabled:opacity-50"
          >
            {navigating ? "Cargando..." : <> Siguiente <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      </div>

      <ResponseModal
        open={modalOpen}
        type={resultType ?? "logrado"}
        onClose={handleModalClose}
        onBack={() => router.push(`/nna/${studentId}`)}
        onConfirm={handleGoNext}
        confirming={navigating}
      />

    </div>
  )
}
