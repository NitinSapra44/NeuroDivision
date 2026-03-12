"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { User } from "lucide-react"
import SideMenu from "@/components/ui/SideMenu"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"

interface Student {
  student_id: string
  full_name: string
  pending_assessment_url?: string | null
}

interface StudentLists {
  managed_students: Student[]
  monitored_students: Student[]
}

export default function IndividualClientDashboard() {
  const router = useRouter()
  const { permissions } = useAppContext()
  const [students, setStudents] = useState<StudentLists | null>(null)
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const primaryAction = permissions?.primary_action     // "ADD_STUDENT" | "UPGRADE_PLAN"
  const slotsUsed = permissions?.slots_used ?? 0
  const slotsTotal = permissions?.slots_total ?? 0
  const hasInstitutionalNna = permissions?.has_institutional_nna ?? false

  useEffect(() => {
    const msg = sessionStorage.getItem("registration_success")
    if (msg) {
      setSuccessMessage(msg)
      sessionStorage.removeItem("registration_success")
      setTimeout(() => setSuccessMessage(null), 4000)
    }

    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase.rpc("get_my_student_lists")
        if (error) throw error
        console.log(data)
        setStudents(data)
      } catch (err) {
        console.error("Error fetching students:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const handleMainAction = () => {
    if (primaryAction === "ADD_STUDENT") {
      router.push("/ingresar-alumno")
    } else {
      router.push("/planes-suscripcion")
    }
  }

  const handleStudentClick = (student: Student) => {
    if (student.pending_assessment_url) {
      router.push(student.pending_assessment_url)
    } else {
      router.push(`/nna/${student.student_id}`)
    }
  }

  const managedStudents = students?.managed_students ?? []
  const monitoredStudents = students?.monitored_students ?? []

  return (
    <section className={`relative w-full flex-1 flex flex-col bg-black text-white font-montserrat ${managedStudents.length > 0 || monitoredStudents.length > 0 ? "min-h-screen" : "h-screen overflow-hidden"}`}>

      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0 h-full">
        <Image
          src="/hero.png"
          alt="Hero Background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-red-600/50 backdrop-brightness-95" />
      </div>

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex flex-col items-center pt-10 md:pt-16 xl:pt-20 text-center w-full max-w-screen-2xl mx-auto px-6 md:px-8 xl:px-10 pr-6 md:pr-24 xl:pr-28 pb-10 md:pb-16">

          {/* ====== MAIN ACTION BUTTON ====== */}
          <button
            onClick={handleMainAction}
            className="bg-black text-white rounded-full
                       border-[4px] border-white
                       w-full xl:max-w-6xl 2xl:max-w-[1280px]
                       h-14 md:h-16 lg:h-[64px] xl:h-[72px] 2xl:h-[80px]
                       px-6 md:px-10
                       text-base xl:text-lg 2xl:text-xl
                       font-bold tracking-tight
                       shadow-2xl
                       hover:bg-zinc-900 transition"
          >
            {primaryAction === "ADD_STUDENT" ? "Ingresar alumno" : "Ver planes de suscripción"}
          </button>

          {/* ====== SUCCESS TOAST ====== */}
          {successMessage && (
            <div className="mt-6 md:mt-8 w-full xl:max-w-6xl 2xl:max-w-[1280px] bg-green-700/80 border border-white/30 rounded-xl px-6 md:px-10 py-4 md:py-6 text-white font-bold text-base xl:text-lg 2xl:text-xl">
              {successMessage}
            </div>
          )}

          {/* ====== LIST 1: ALUMNOS REGISTRADOS ====== */}
          <div className="w-full xl:max-w-6xl 2xl:max-w-[1280px] mt-10 md:mt-12 xl:mt-14 2xl:mt-16">
            <h2 className="text-white font-bold text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl mb-6 md:mb-10 xl:mb-12 text-center">
              Alumnos registrados ({slotsUsed}/{slotsTotal})
            </h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : managedStudents.length === 0 ? (
              <p className="text-white text-base md:text-lg xl:text-xl font-medium mt-4 text-center">
                No hay registros de alumnos propios
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3  gap-6 md:gap-8 xl:gap-10 mt-6 justify-items-center">
                {managedStudents.map((student) => (
                  <StudentCard
                    key={student.student_id}
                    student={student}
                    onClick={() => handleStudentClick(student)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ====== LIST 2: ALUMNOS EN SEGUIMIENTO ESCOLAR ====== */}
          {hasInstitutionalNna && (
            <div className="w-full xl:max-w-6xl 2xl:max-w-[1280px] mt-16 md:mt-20 xl:mt-24">
              <h2 className="text-white font-bold text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl mb-6 md:mb-10 xl:mb-12 text-center">
                Alumnos en seguimiento escolar
              </h2>
              {monitoredStudents.length === 0 ? (
                <p className="text-white/70 text-sm md:text-base xl:text-lg font-medium text-center">
                  No hay alumnos en seguimiento escolar
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3  gap-6 md:gap-8 xl:gap-10 mt-6 justify-items-center">
                  {monitoredStudents.map((student) => (
                    <StudentCard
                      key={student.student_id}
                      student={student}
                      onClick={() => handleStudentClick(student)}
                      readonly
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ================= SIDE MENU ================= */}
      <SideMenu />

    </section>
  )
}

function StudentCard({
  student,
  onClick,
  readonly = false,
}: {
  student: Student
  onClick: () => void
  readonly?: boolean
}) {
  const hasPending = !!student.pending_assessment_url

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 md:gap-3 xl:gap-4 group focus:outline-none"
    >
      <div className="relative">
        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 rounded-full bg-white border-4 border-white/70 flex items-center justify-center group-hover:border-white group-hover:scale-105 group-hover:shadow-2xl transition-all duration-200 overflow-hidden shadow-lg">
          <User className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 xl:w-20 xl:h-20 text-[#ED3237]" />
        </div>
        {hasPending && (
          <span className="absolute top-1 right-1 md:top-3 md:right-3 w-5 h-5 md:w-7 md:h-7 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center shadow-md">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v4m0 4h.01" />
            </svg>
          </span>
        )}
      </div>
      <span className="text-white font-bold text-sm md:text-base xl:text-lg text-center max-w-[160px] leading-snug">
        {student.full_name}
      </span>
      {hasPending && (
        <span className="text-yellow-300 text-xs font-semibold uppercase tracking-wider">
          Evaluación pendiente
        </span>
      )}
      {readonly && !hasPending && (
        <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">
          Seguimiento
        </span>
      )}
    </button>
  )
}
