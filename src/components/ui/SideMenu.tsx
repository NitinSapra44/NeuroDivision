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
      {/* Desktop: static right side menu — bare icons, white, no circles */}
      <div className="hidden md:flex flex-col gap-8 items-center pt-16 px-4 xl:px-6 shrink-0 z-30">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:scale-110 active:scale-95 transition-all duration-200"
          title="Inicio"
        >
          <Home className="w-12 h-12 text-white" />
        </button>
        <button
          className="opacity-40 cursor-not-allowed"
          title="Notificaciones (próximamente)"
          disabled
        >
          <Bell className="w-12 h-12 text-white" />
        </button>
        <button
          className="opacity-40 cursor-not-allowed"
          title="Opciones de usuario (próximamente)"
          disabled
        >
          <User className="w-12 h-12 text-white" />
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Cerrar sesión"
        >
          <LogOut className="w-12 h-12 text-white" />
        </button>
      </div>

      {/* Mobile: bottom bar */}
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
