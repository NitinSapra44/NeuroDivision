"use client"

import { useRouter } from "next/navigation"
import { Home, Bell, User, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import { useState, useEffect } from "react"

export default function SideMenu() {
  const router = useRouter()
  const { clearContext } = useAppContext()
  const [loggingOut, setLoggingOut] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const checkUnread = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { count } = await supabase
        .from("notification")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      setHasUnread((count ?? 0) > 0)
    }

    checkUnread()
  }, [])

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
          onClick={() => router.push("/notificaciones")}
          className="hover:scale-110 active:scale-95 transition-all duration-200 relative"
          title="Notificaciones"
        >
          <Bell className="w-12 h-12 text-white" />
          {hasUnread && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#ED3237] rounded-full border-2 border-white" />
          )}
        </button>
        <button
          onClick={() => router.push("/perfil")}
          className="hover:scale-110 active:scale-95 transition-all duration-200"
          title="Perfil"
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
          onClick={() => router.push("/notificaciones")}
          className="flex flex-col items-center gap-1 relative"
          title="Notificaciones"
        >
          <Bell className="w-6 h-6 text-white" />
          {hasUnread && (
            <span className="absolute top-0 right-2 w-2.5 h-2.5 bg-[#ED3237] rounded-full border border-white" />
          )}
          <span className="text-white text-xs font-semibold">Avisos</span>
        </button>
        <button
          onClick={() => router.push("/perfil")}
          className="flex flex-col items-center gap-1"
          title="Perfil"
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
