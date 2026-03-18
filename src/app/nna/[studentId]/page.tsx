"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Building2, User } from "lucide-react"
import { useNnaContext } from "./NnaContext"
import PageLoader from "@/components/ui/PageLoader"

export default function NnaStudentPage() {
  return <NnaStudentContent />
}

function NnaStudentContent() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string
  const { student, metrics, permissions, dataLoading } = useNnaContext()

  const chartRef = useRef<HTMLDivElement>(null)
  const [linePoints, setLinePoints] = useState("")

  useEffect(() => {
    const calculate = () => {
      if (!chartRef.current || metrics.length < 2) return
      const container = chartRef.current
      container.getBoundingClientRect()
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

  if (dataLoading) return <PageLoader />

  const cardColors = [
    "bg-[#9B69C2]", "bg-[#BCA9CE]", "bg-[#A366FF]",
    "bg-[#5C66FF]", "bg-[#0000FF]",
  ]

  return (
    <div className="h-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-8 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

      {/* MOBILE: avatar + student name + institution badge + stars */}
      {metrics.length > 0 && (
        <div className="flex md:hidden flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#ED3237] flex items-center justify-center shadow-sm mb-3">
            <User className="w-10 h-10 text-white" />
          </div>
          {student?.institution_name && (
            <div className="flex items-center gap-1.5 mb-2 px-3 py-1 bg-gray-100 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-gray-600 text-xs font-semibold">{student.institution_name}</span>
            </div>
          )}
          {student && <p className="text-[#ED3237] font-bold text-lg mb-2">{student.first_name}</p>}
          <div className="flex justify-center gap-6 flex-wrap">
            {metrics.map((m) => (
              <div key={m.section_id} className="flex flex-col items-center">
                <span className={m.has_star ? "text-[#ED3237] text-xl" : "text-gray-400 text-xl"}>★</span>
                <p className="text-xs font-bold text-center mt-1">{m.section_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRAPH */}
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
                permissions?.can_view_activities &&
                router.push(`/nna/${studentId}/activities?section_id=${m.section_id}&section_name=${encodeURIComponent(m.section_name)}`)
              }
              disabled={!permissions?.can_view_activities}
              className="flex flex-col items-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
            >
              <div
                className={`w-full h-24 sm:h-32 md:h-40 rounded-[20px] border-[3.5px] border-black transition-all duration-200 group-hover:scale-[1.05] group-hover:shadow-2xl group-hover:brightness-95 ${cardColors[index % cardColors.length]}`}
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
  )
}
