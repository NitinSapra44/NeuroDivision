"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const handleUpdatePassword = async () => {
    setError(null)
    setMessage(null)

    if (!password) {
      setError("Por favor ingrese una nueva contraseña")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage("Contraseña actualizada correctamente")
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  return (
     <section className="h-screen flex-1 overflow-hidden flex flex-col  bg-[#ED3237] font-montserrat py-5">

       <div className="max-w-[1280px] w-[85%] md:w-[68%]  mx-auto">

        {/* ================= TITLE ================= */}
        <h1 className="text-white text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-center mb-6 md:mb-8 xl:mb-10 tracking-wide">
          Restablecer contraseña
        </h1>

        <div className="space-y-5 sm:space-y-6 md:space-y-8">

          {/* ================= NEW PASSWORD ================= */}
          <div>
            <label className="block text-white text-lg md:text-xl xl:text-2xl 2xl:text-3xl font-bold mb-2 text-center">
              Nueva contraseña
            </label>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D64641] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />

              <input
                type="password"
                placeholder="Ingrese nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="
                        w-full
                  h-14 md:h-16 lg:h-[64px] xl:h-[72px] 2xl:h-[80px]
                  bg-white
                  font-montserrat
                  text-black
                  rounded-full
                  border-[4px] border-black
                  pl-12 md:pl-16
                  py-2 md:py-4
                  text-base xl:text-lg 2xl:text-xl
                  placeholder:text-gray-400
                  focus:outline-none
                  shadow-lg
                "
              />
            </div>
          </div>

          {/* ================= REPEAT PASSWORD ================= */}
          <div>
            <label className="block text-white text-base sm:text-lg md:text-xl font-bold mb-2 text-center">
              Repetir contraseña
            </label>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D64641] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />

              <input
                type="password"
                placeholder="Ingrese nuevamente su contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="
                      w-full
                  h-14 md:h-16 lg:h-[64px] xl:h-[72px] 2xl:h-[80px]
                  bg-white
                  font-montserrat
                  text-black
                  rounded-full
                  border-[4px] border-black
                  pl-12 md:pl-16
                  py-2 md:py-4
                  text-base xl:text-lg 2xl:text-xl
                  placeholder:text-gray-400
                  focus:outline-none
                  shadow-lg
                "
              />
            </div>
          </div>

          {message && (
            <div className="text-white text-sm sm:text-base font-bold text-center bg-green-600/50 p-3 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="text-white text-sm sm:text-base font-bold text-center bg-black/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* ================= CONFIRM BUTTON ================= */}
          <div className="pt-1 sm:pt-2">
            <button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="
                    w-full
                h-14 md:h-16 lg:h-[64px] xl:h-[72px] 2xl:h-[80px]
                px-6 md:px-10
                bg-black
                text-white
                rounded-full
                font-montserrat
                border-[4px] border-white
                text-base xl:text-2xl 2xl:text-3xl
                font-bold
                hover:bg-zinc-900
                transition
                shadow-xl
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? 'Actualizando...' : 'Confirmar'}
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
