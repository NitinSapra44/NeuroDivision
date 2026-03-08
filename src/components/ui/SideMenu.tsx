"use client"

import { useRouter } from "next/navigation"
import { Home, Bell, User, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import { useState } from "react"

export default function SideMenu() {
  const router = useRouter()
  const { clearContext } = useAppContext()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      clearContext()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <>
      {/* Desktop: fixed right side menu */}
      <div className="hidden md:flex fixed right-4 xl:right-8 top-32 lg:top-36 xl:top-40 flex-col gap-4 lg:gap-5 xl:gap-6 items-center z-30">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-12 h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 rounded-full border-[3px] border-white bg-white/10 flex items-center justify-center hover:bg-white/25 transition"
          title="Inicio"
        >
          <Home className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
        </button>
        <button
          className="w-12 h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 rounded-full border-[3px] border-white/50 bg-white/5 flex items-center justify-center opacity-60 cursor-not-allowed"
          title="Notificaciones (próximamente)"
          disabled
        >
          <Bell className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
        </button>
        <button
          className="w-12 h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 rounded-full border-[3px] border-white/50 bg-white/5 flex items-center justify-center opacity-60 cursor-not-allowed"
          title="Opciones de usuario (próximamente)"
          disabled
        >
          <User className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-12 h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 rounded-full border-[3px] border-white bg-white/10 flex items-center justify-center hover:bg-white/25 transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
        </button>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/20 flex justify-around items-center py-3 z-30">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex flex-col items-center gap-1"
          title="Inicio"
        >
          <Home className="w-6 h-6 text-white" />
          <span className="text-white text-xs font-semibold">Inicio</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 opacity-50"
          disabled
          title="Notificaciones (próximamente)"
        >
          <Bell className="w-6 h-6 text-white" />
          <span className="text-white text-xs font-semibold">Avisos</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 opacity-50"
          disabled
          title="Opciones de usuario (próximamente)"
        >
          <User className="w-6 h-6 text-white" />
          <span className="text-white text-xs font-semibold">Perfil</span>
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex flex-col items-center gap-1"
          title="Cerrar sesión"
        >
          <LogOut className="w-6 h-6 text-white" />
          <span className="text-white text-xs font-semibold">Salir</span>
        </button>
      </div>
    </>
  )
}
