"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Calendar, ChevronDown } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import SideMenu from "@/components/ui/SideMenu"

export default function IngresarAlumnoPage() {
  return (
    <ProtectedRoute>
      <IngresarAlumnoContent />
    </ProtectedRoute>
  )
}

function IngresarAlumnoContent() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [sex, setSex] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !birthdate || !sex) {
      setError("Por favor complete todos los campos")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc("init_student_diagnosis", {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_birthdate: birthdate,
        p_sex: sex,
      })
      

      if (rpcError) throw rpcError

      if (data?.redirect_url) {
        sessionStorage.setItem(
          "registration_success",
          `Alumno ${firstName} registrado exitosamente`
        )
        router.push(data.redirect_url)
      } else {
        throw new Error("No se recibió la URL de redirección")
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al registrar el alumno")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative w-full min-h-screen overflow-hidden font-montserrat text-white">

      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero.png"
          alt="Background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-red-600/55 backdrop-brightness-95" />
      </div>

      <div className="relative z-10 flex w-full">
      <div className="flex-1">

      {/* ================= CONTENT ================= */}
      <div className="relative flex flex-col items-center pt-4 md:pt-6 px-6 pb-6 md:pb-8 max-w-5xl mx-auto">

        {/* ================= HEADINGS ================= */}
        <h1 className="text-3xl md:text-4xl font-extrabold  text-center tracking-wide">
          INGRESAR ALUMNO
        </h1>
        <h2 className="text-2xl md:text-4xl  font-extrabold  mt-2 text-center">
          INFORMACIÓN PERSONAL
        </h2>

        {/* ================= FORM ================= */}
        <form onSubmit={handleConfirm} className="w-full mt-4 md:mt-6 space-y-3 md:space-y-8">

          {/* NOMBRE */}
          <div>
            <label className="block text-center text-lg md:text-xl xl:text-2xl font-bold mb-1.5">Nombre</label>
            <input
              type="text"
              placeholder="Ingrese nombre del alumno"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black rounded-full border-[3px] border-black px-8 py-4 md:py-5 text-base md:text-lg xl:text-xl placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* APELLIDO */}
          <div>
            <label className="block text-center text-lg md:text-xl xl:text-2xl font-bold mb-1.5">Apellido</label>
            <input
              type="text"
              placeholder="Ingrese apellidos del alumno"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black rounded-full border-[3px] border-black px-8 py-4 md:py-5 text-base md:text-lg xl:text-xl placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* FECHA + SEXO */}
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">

            <div>
              <label className="block text-center text-lg md:text-xl xl:text-2xl font-bold mb-1.5">Fecha de nacimiento</label>
              <div className="relative">
                <Calendar className="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6 pointer-events-none" />
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={loading}
                  className="w-full bg-white text-black rounded-full border-[3px] border-black px-6 md:pl-14 md:pr-6 py-4 md:py-5 text-base md:text-lg focus:outline-none disabled:opacity-60 appearance-none"
                />
                <ChevronDown className="md:hidden absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-center text-lg md:text-xl xl:text-2xl font-bold mb-1.5">Sexo</label>
              <div className="relative">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white text-black rounded-full border-[3px] border-black px-8 pr-12 py-4 md:py-5 text-base md:text-lg focus:outline-none disabled:opacity-60 appearance-none"
                >
                  <option value="">Seleccione sexo</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 md:w-6 md:h-6 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-black/30 border border-white/30 rounded-xl px-6 py-4 text-white font-bold text-center text-lg">
              {error}
            </div>
          )}

          {/* CONFIRM */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-full border-4 border-white py-4 md:py-5 text-xl md:text-2xl font-bold shadow-xl hover:bg-zinc-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registrando..." : "Confirmar"}
          </button>

        </form>
      </div>

      </div>

      {/* ================= SIDE MENU ================= */}
      <SideMenu />

      </div>

    </section>
  )
}
