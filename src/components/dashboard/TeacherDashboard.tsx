"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Building2, User, ArrowRight } from "lucide-react"
import SideMenu from "@/components/ui/SideMenu"
import { supabase } from "@/lib/supabase/client"

interface Course {
  course_id: number
  course_name: string
  student_limit: number
  total_students: number
}

interface TeacherOverview {
  teacher_name: string
  institution_name: string
  global_subscription_active: boolean
  total_courses: number
  courses: Course[]
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [data, setData] = useState<TeacherOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const { data: rpcData, error } = await supabase.rpc("get_teacher_courses_overview")
        if (error) throw error
        setData(rpcData)
      } catch (err) {
        console.error("Error fetching teacher overview:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [])

  const courses = data?.courses ?? []

  return (
    <section className="relative w-full min-h-screen flex bg-black text-white font-montserrat">

      {/* BACKGROUND */}
      <div className="absolute inset-0">
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

      {/* MAIN LAYOUT */}
      <div className="relative z-10 flex w-full">

   

        {/* CONTENT */}
        <div className="flex flex-col items-center flex-1 pt-10 md:pt-16 xl:pt-20 px-6 md:px-8 xl:px-10 pb-10 md:pb-16">

          {/* HEADER */}
          <div className="w-full xl:max-w-6xl 2xl:max-w-[1280px] flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 md:mb-12">

            {/* Institution */}
            <div className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-2 border border-white/20">
              <Building2 className="w-5 h-5 text-white shrink-0" />
              <span className="text-white font-semibold text-sm md:text-base xl:text-lg">
                {loading ? "Cargando..." : (data?.institution_name ?? "Sin institución")}
              </span>
            </div>

            {/* Teacher */}
            <div className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-2 border border-white/20">
              <User className="w-5 h-5 text-white shrink-0" />
              <span className="text-white font-semibold text-sm md:text-base xl:text-lg">
                {loading ? "Cargando..." : (data?.teacher_name ?? "")}
              </span>
            </div>

          </div>

          {/* COURSES */}
          {loading ? (
            <div className="flex justify-center py-16">
              <p className="text-white/50 font-semibold text-base">Cargando…</p>
            </div>
          ) : courses.length === 0 ? (
            <p className="text-white text-base md:text-lg xl:text-xl font-medium text-center mt-8">
              No tienes cursos asignados
            </p>
          ) : (
            <div className="w-full xl:max-w-6xl 2xl:max-w-[1280px] flex flex-col gap-5 md:gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.course_id}
                  course={course}
                  onEnter={() => router.push(`/curso/${course.course_id}`)}
                />
              ))}
            </div>
          )}

        </div>

             {/* SIDE MENU */}
        <SideMenu />
      </div>

    </section>
  )
}

function CourseCard({ course, onEnter }: { course: Course; onEnter: () => void }) {
  return (
    <div className="w-full bg-black/40 border border-white/20 rounded-2xl px-6 md:px-8 py-5 md:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-sm">

      {/* Course Info */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-white/70 shrink-0" />
          <span className="text-white font-bold text-lg md:text-xl xl:text-2xl">
            {course.course_name}
          </span>
        </div>
        <span className="text-white/80 text-sm md:text-base font-medium pl-7">
          Alumnos: {course.total_students}/{course.student_limit}
        </span>
      </div>

      {/* Enter Button */}
      <button
        onClick={onEnter}
        className="flex items-center gap-2 bg-black text-white rounded-full border-2 border-white px-6 py-2.5 text-sm md:text-base font-bold hover:bg-zinc-900 transition shrink-0"
      >
        Entrar <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  )
}