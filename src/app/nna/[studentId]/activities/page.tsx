"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Home, User } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import { useNnaContext } from "../NnaContext"

interface Activity {
  activity_id: number
  is_success: boolean | null
}

export default function ActivitiesPage() {
  return <ActivitiesContent />
}

function ActivitiesContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const sectionId = Number(searchParams.get("section_id"))
  const sectionName = searchParams.get("section_name") ?? "Sección"

  const { student, metrics } = useNnaContext()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sectionId) {
      setError("Sección no especificada.")
      setLoading(false)
      return
    }

    const fetchActivities = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_nna_section_activities", {
          p_nna_user_id: studentId,
          p_section_id: sectionId,
        })
        if (rpcError) throw rpcError
        setActivities(data ?? [])
      } catch (err: any) {
        console.error(err)
        setError("No se pudieron cargar las actividades.")
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [studentId, sectionId])

  if (loading) return (
    <div className="w-full flex items-center justify-center min-h-screen bg-[#F2F2F2]">
      <div className="w-48 h-[3px] overflow-hidden">
        <div className="h-full w-1/3 bg-[#ED3237] animate-page-bar" />
      </div>
    </div>
  )

  if (error) {
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

  return (
    <div className="min-h-full bg-[#F2F2F2] px-[clamp(16px,3vw,80px)] pt-6 md:pt-10 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

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

      {/* Header with home + title */}
      <div className="relative flex items-center justify-center mb-8 md:mb-12">
        <div className="absolute left-0 hidden md:block">
          <button onClick={() => router.push(`/nna/${studentId}`)} className="hover:scale-110 transition-transform">
            <Home className="w-10 h-10 md:w-12 md:h-12 text-[#ED3237]" />
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
  )
}
