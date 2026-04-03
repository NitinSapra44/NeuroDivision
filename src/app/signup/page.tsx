"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Mail, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo")

  const handleSignup = async () => {
    setError(null)

    // Basic form validations
    if (!fullName.trim()) {
      setError("Por favor ingrese su nombre de usuario")
      return
    }
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
      setError("Por favor ingrese una contraseña")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (authError) throw authError

      setSuccess(true)
      const loginTarget = redirectTo
        ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/login'
      setTimeout(() => router.push(loginTarget), 2500)
    } catch (err: any) {
      setError(err.message || "Error al crear cuenta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex-1 flex flex-col  bg-[#ED3237] font-montserrat py-5">
      <div className="max-w-[1280px] w-[85%] md:w-[68%]  mx-auto">

        <div className="space-y-6 md:space-y-8 xl:space-y-10 2xl:space-y-12 max-w-xl mx-auto xl:max-w-4xl 2xl:max-w-[1280px]">

          {/* ================= USERNAME ================= */}
          <div>
            <label className="block text-white text-lg md:text-xl xl:text-2xl 2xl:text-3xl font-bold mb-2 text-center">
              Nombre usuario
            </label>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D64641] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />

              <input
                type="text"
                placeholder="Rodrigo Andrés Tapia Jensen"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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

          {/* ================= EMAIL ================= */}
          <div>
            <label className="block text-white text-lg md:text-xl xl:text-2xl 2xl:text-3xl font-bold mb-2 text-center">
              Correo
            </label>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D64641] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />

              <input
                type="email"
                placeholder="r.tapia.jensen@gmail.com"
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

          {success && (
            <div className="text-white text-[clamp(14px,1vw,18px)] font-bold text-center bg-green-600/50 p-3 rounded-lg">
              Cuenta creada exitosamente. Redirigiendo al inicio de sesión...
            </div>
          )}

          {error && (
            <div className="text-white text-[clamp(14px,1vw,18px)] font-bold text-center bg-black/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* ================= SUBMIT BUTTON ================= */}
          <div className="pt-2 sm:pt-4 text-center space-y-3">
            <button
              onClick={handleSignup}
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <button
              onClick={() => {
                const target = redirectTo
                  ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
                  : '/login'
                router.push(target)
              }}
              className="text-white text-[clamp(14px,1vw,18px)] font-bold underline underline-offset-4 hover:opacity-80 transition"
            >
              Ya tengo cuenta
            </button>
          </div>

        </div>

      </div>
    </section>
  )
}

export default function SignupPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#ED3237] flex items-center justify-center font-montserrat">
        <p className="text-white text-lg">Cargando...</p>
      </div>
    }>
      <SignupPage />
    </Suspense>
  )
}
