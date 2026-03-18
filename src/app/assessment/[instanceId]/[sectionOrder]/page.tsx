"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

interface StepperItem {
  display_order: number
  label: string
  state: "CURRENT" | "COMPLETED" | "UNLOCKED" | "LOCKED"
  is_navigable: boolean
}

interface AssessmentItem {
  item_id: number
  question_text: string
  is_checked: boolean
}

interface AssessmentData {
  status: string
  current_section: number
  stepper: StepperItem[]
  items: AssessmentItem[]
}

export default function AssessmentPage() {
  return <AssessmentContent />
}

function AssessmentContent() {
  const router = useRouter()
  const params = useParams()
  const instanceId = Number(params.instanceId)
  const sectionOrder = Number(params.sectionOrder)

  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssessment = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc("get_assessment_step", {
        p_instance_id: instanceId,
        p_section_order: sectionOrder,
      })
      if (rpcError) throw rpcError

      if (data?.status === "COMPLETED") {
        router.push("/dashboard")
        return
      }

      setAssessmentData(data)
      const initial: Record<number, boolean> = {}
      data?.items?.forEach((item: AssessmentItem) => {
        initial[item.item_id] = item.is_checked
      })
      setCheckedItems(initial)
    } catch (err: any) {
      console.error(err)
      setError("No se puede acceder a esta sección. Redirigiendo...")
      setTimeout(() => router.push("/dashboard"), 1500)
    } finally {
      setLoading(false)
    }
  }, [instanceId, sectionOrder, router])

  useEffect(() => { fetchAssessment() }, [fetchAssessment])

  const handleToggle = (itemId: number) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const handleConfirm = async () => {
    if (!assessmentData) return
    setSaving(true)
    setError(null)
    try {
      const responsesPayload = assessmentData.items.map((item) => ({
        item_id: item.item_id,
        value: checkedItems[item.item_id] ?? false,
      }))

      const { data, error: rpcError } = await supabase.rpc("submit_section_response", {
        p_instance_id: instanceId,
        p_section_order: sectionOrder,
        p_responses: responsesPayload,
      })
      if (rpcError) throw rpcError

      const redirectUrl = data?.redirect_url || "/dashboard"
      router.push(redirectUrl)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      console.error(err)
      setError("Error al guardar. Intente nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading: centered spinner over the persistent background ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-130px)]">
        <div className="w-12 h-12 rounded-full border-4 border-red-600/40 border-t-white animate-spin" />
      </div>
    )
  }

  /* ── Error (no data) ── */
  if (error && !assessmentData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-130px)]">
        <div className="text-center px-6">
          <p className="text-2xl font-bold mb-6">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="bg-black text-white px-8 py-4 rounded-full font-bold text-xl hover:bg-zinc-900 transition">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (!assessmentData) return null

  return (
    <div className="relative flex flex-col items-center px-6 pt-10 pb-24 md:pb-16 max-w-6xl mx-auto">

      {/* Header */}
      <div className="w-full flex items-center justify-center relative mb-2">
        <button
          onClick={() => sectionOrder > 1 && router.push(`/assessment/${instanceId}/${sectionOrder - 1}`)}
          disabled={sectionOrder <= 1}
          className="absolute left-0 text-white hover:opacity-80 transition disabled:opacity-30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-3xl md:text-4xl font-bold tracking-wide text-center">
          PAUTA DE ENTRADA
        </h1>
      </div>

      {/* Stepper */}
      <div className="w-full mt-4 text-center font-bold">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-lg md:text-2xl lg:text-3xl px-4">
          {assessmentData.stepper.map((step) => (
            <StepperLabel key={step.display_order} step={step} instanceId={instanceId} />
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="w-full mt-3 flex justify-center">
        <p className="max-w-4xl text-center text-lg md:text-2xl font-semibold leading-snug">
          Marca aquella conducta, acción, emoción o reacción que realiza el niño o niña. Puedes marcar más de una.
        </p>
      </div>

      {/* Checklist */}
      <div className="w-full mt-8 max-w-3xl space-y-5 text-xl md:text-2xl">
        {assessmentData.items.map((item) => (
          <label
            key={item.item_id}
            className="flex items-center gap-5 cursor-pointer"
            onClick={() => handleToggle(item.item_id)}
          >
            <div
              className={`w-7 h-7 md:w-8 md:h-8 shrink-0 border-2 border-black flex items-center justify-center transition ${
                checkedItems[item.item_id] ? "bg-black" : "bg-white"
              }`}
            >
              {checkedItems[item.item_id] && (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-semibold select-none">{item.question_text}</span>
          </label>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full mt-6 bg-black/30 border border-white/30 rounded-xl px-6 py-4 text-white font-bold text-center">
          {error}
        </div>
      )}

      {/* Confirm */}
      <div className="w-full mt-10">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full bg-black text-white rounded-full border-4 border-white py-5 text-xl md:text-2xl font-bold shadow-xl hover:bg-zinc-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Guardando..." : "Confirmar"}
        </button>
      </div>

    </div>
  )
}

function StepperLabel({ step, instanceId }: { step: StepperItem; instanceId: number }) {
  const router = useRouter()
  const isCurrent = step.state === "CURRENT"
  const isCompleted = step.state === "COMPLETED"
  const isUnlocked = step.state === "UNLOCKED"

  return (
    <button
      onClick={() => step.is_navigable && router.push(`/assessment/${instanceId}/${step.display_order}`)}
      disabled={!step.is_navigable}
      className={`flex items-center gap-2 transition ${
        isCurrent ? "text-white font-extrabold" :
        isCompleted ? "text-white/50 hover:text-white/80 cursor-pointer" :
        isUnlocked ? "text-white/70 hover:text-white cursor-pointer" :
        "text-white/30 cursor-not-allowed"
      }`}
    >
      {isCompleted && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {step.label}
    </button>
  )
}
