"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo")
  const { setPermissions } = useAppContext()

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Basic form validations
    if (!email.trim()) {
      setError("Por favor ingrese su correo electrónico")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Por favor ingrese un correo electrónico válido")
      return
    }
    if (!password) {
      setError("Por favor ingrese su contraseña")
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      console.log("LOGIN SUCCESS", authData)

      // If there's a redirectTo param, skip get_app_context and redirect directly
      if (redirectTo) {
        router.push(redirectTo)
        return
      }

      // Fetch app context only when no redirectTo
      console.log("Calling RPC get_app_context")
      const { data: contextData, error: contextError } = await supabase.rpc('get_app_context')

      console.log("RPC RESULT:", contextData, contextError)

      if (contextError) throw contextError

      if (contextData) {
        setPermissions(contextData.permissions)
        router.push(contextData.redirect_to)
      } else {
        throw new Error("No se pudo obtener el contexto de la aplicación")
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="h-screen flex-1 overflow-hidden flex flex-col  bg-[#ED3237] font-montserrat py-5">
      <div className="w-full max-w-screen-2xl mx-auto px-6 md:px-8 xl:px-10">
        <div className="max-w-[1280px] w-[85%] md:w-[68%]  mx-auto">

          {/* ================= TITLE ================= */}
          <h1 className="text-white text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-center mb-6 md:mb-8 xl:mb-10 tracking-wide">
            INICIAR SESIÓN
          </h1>

          <form onSubmit={handleLogin} className="space-y-6 md:space-y-8 xl:space-y-10 2xl:space-y-12">

            {/* ================= USERNAME ================= */}
            <div>
              <label className="block text-white text-lg md:text-xl xl:text-2xl 2xl:text-3xl font-bold mb-2 text-center">
                Nombre usuario
              </label>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D64641] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="
                  w-full
                  h-14 md:h-16 lg:h-[64px] xl:h-[72px] 2xl:h-[80px]
                  font-montserrat
                  bg-white
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

            {/* ================= PASSWORD ================= */}
            <div>
              <label className="block text-white text-lg md:text-xl xl:text-2xl 2xl:text-3xl font-bold mb-2 text-center">
                Clave
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D64641] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />

                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Contraseña"
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

            {error && (
              <div className="text-white text-[clamp(0.9rem,1vw,1.2rem)] font-bold text-center bg-black/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* ================= LOGIN BUTTON ================= */}
            <div className="pt-1 sm:pt-2 text-center">
              <button
                type="submit"
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
                {loading ? 'Iniciando...' : 'Iniciar sesión'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="mt-2 text-white text-sm md:text-lg font-bold underline underline-offset-4 hover:opacity-80 transition"
              >
                Olvidó contraseña
              </button>
            </div>

            {/* ================= CREATE ACCOUNT ================= */}
            <div className="pt-2 sm:pt-3 text-center">
              <label className="block text-white text-sm md:text-base xl:text-lg 2xl:text-xl font-bold mb-2">
                Nuevo usuario
              </label>

              <button
                type="button"
                onClick={() => {
                  const target = redirectTo
                    ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                    : '/signup'
                  router.push(target)
                }}
                className="
                w-full
                h-14 md:h-16 lg:h-[64px] xl:h-[72px] 2xl:h-[80px]
                px-6 md:px-10
                bg-black
                text-white
                rounded-full
                border-[4px] border-white
                text-base xl:text-2xl 2xl:text-3xl
                font-bold
                hover:bg-zinc-900
                transition
                shadow-xl
                font-montserrat
              "
              >
                Crear cuenta
              </button>
            </div>

          </form>
        </div>
      </div>
    </section>
  )
}
