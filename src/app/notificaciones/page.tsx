"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import SideMenu from "@/components/ui/SideMenu"
import Modal from "@/components/ui/Modal"
import { supabase } from "@/lib/supabase/client"

interface Notification {
  id: string
  title: string
  subtitle: string
  content: string
  type: string
  created_at: string
  is_read: boolean
}

const typeLabels: Record<string, string> = {
  ALERTA_PAGO: "Alerta",
  REFUERZO_POSITIVO: "Recomendación",
  DIAGNOSTICO: "Diagnóstico",
  SUSCRIPCION: "Suscripción",
  AVISO: "Aviso",
}

function getTimeAgo(dateStr: string): string {
  const created = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? "s" : ""}`
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`
  return `Hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`
}

type Filter = "all" | "unread"

function NotificacionesContent() {
  const [filter, setFilter] = useState<Filter>("unread")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) return

        let query = supabase
          .from("notification")
          .select("id, title, subtitle, content, type, created_at, is_read")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (filter === "unread") {
          query = query.eq("is_read", false)
        }

        const { data, error } = await query
        if (!error) setNotifications(data ?? [])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [filter])

  const handleView = async (notif: Notification) => {
    setSelectedNotif(notif)
    if (!notif.is_read) {
      await supabase.from("notification").update({ is_read: true }).eq("id", notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
    }
  }

  const modalTitle = selectedNotif
    ? (typeLabels[selectedNotif.type] ?? selectedNotif.title)
    : ""

  return (
    <section className="relative w-full min-h-screen flex bg-black text-white font-montserrat">
      {/* Background */}
      <div className="absolute inset-0">
        <Image src="/hero.png" alt="background" fill priority quality={100} className="object-cover object-center" />
        <div className="absolute inset-0 bg-red-600/50 backdrop-brightness-95" />
      </div>

      <div className="relative z-10 flex w-full">
        <div className="hidden md:block w-20 xl:w-24 shrink-0" />

        <div className="flex flex-col flex-1 pt-10 md:pt-14 xl:pt-16 px-4 md:px-8 xl:px-10 pb-24 md:pb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-8">NOTIFICACIONES</h1>

          {/* Filter buttons */}
          <div className="flex gap-3 justify-center mb-8 w-full max-w-xs mx-auto">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 h-11 rounded-full font-bold text-sm border-2 transition-all ${
                filter === "all"
                  ? "bg-black text-white border-black"
                  : "bg-transparent text-white border-white/50 hover:border-white"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`flex-1 h-11 rounded-full font-bold text-sm border-2 transition-all ${
                filter === "unread"
                  ? "bg-black text-white border-black"
                  : "bg-transparent text-white border-white/50 hover:border-white"
              }`}
            >
              No leídas
            </button>
          </div>

          {/* Notification list */}
          <div className="w-full max-w-3xl mx-auto">
            {loading ? (
              <p className="text-white/60 text-center font-semibold">Cargando...</p>
            ) : notifications.length === 0 ? (
              <p className="text-white text-center font-semibold text-lg mt-8 leading-relaxed max-w-sm mx-auto">
                ¡Al día! Aquí verás tus próximos desafíos y alertas
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-white rounded-2xl border-l-4 border-l-[#ED3237] shadow-sm overflow-hidden"
                  >
                    <div className="p-5 flex flex-col gap-1">
                      <span className="text-xs text-gray-400 font-medium self-end">
                        {getTimeAgo(notif.created_at)}
                      </span>
                      <h3 className="text-lg font-extrabold text-black text-center">{notif.title}</h3>
                      <p className="text-sm text-gray-600 text-center mb-3">{notif.subtitle}</p>
                      <button
                        onClick={() => handleView(notif)}
                        className="w-full h-10 bg-[#ED3237] text-white font-bold rounded-full border-2 border-black hover:scale-[1.02] transition text-sm"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SideMenu />
      </div>

      {/* Notification detail modal */}
      {selectedNotif && (
        <Modal
          open
          title={modalTitle}
          onClose={() => setSelectedNotif(null)}
          actions={
            <button
              onClick={() => setSelectedNotif(null)}
              className="w-full h-14 bg-[#ED3237] text-white font-bold rounded-full border-4 border-black hover:scale-[1.02] transition"
            >
              Cerrar
            </button>
          }
        >
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">{getTimeAgo(selectedNotif.created_at)}</p>
            <p className="text-black font-medium text-base leading-relaxed">{selectedNotif.content}</p>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default function NotificacionesPage() {
  return (
    <ProtectedRoute>
      <NotificacionesContent />
    </ProtectedRoute>
  )
}
