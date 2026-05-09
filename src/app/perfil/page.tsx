"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Mail, Lock, User, Eye, EyeOff, X } from "lucide-react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import SideMenu from "@/components/ui/SideMenu"
import Modal from "@/components/ui/Modal"
import CheckoutSuscripcion from "@/components/CheckoutSuscripcion"
import { supabase } from "@/lib/supabase/client"

const inputClass =
  "w-full border-2 border-black rounded-xl px-4 py-3 text-base font-semibold bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#ED3237]"
const btnPrimary =
  "w-full h-14 bg-[#ED3237] text-white font-bold rounded-full border-4 border-black hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"

interface Subscription {
  id: string
  plan_name: string
  status: string
  price: string
  slots: number | string
}

function EditIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3.414 1.414 1.414-3.414A4 4 0 019 13z"
      />
    </svg>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-extrabold text-black text-center mb-5">{title}</h2>
      {children}
    </div>
  )
}

function PerfilContent() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadingName, setLoadingName] = useState(true)
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Edit name modal
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [savingName, setSavingName] = useState(false)

  // Password modal
  const [passModalOpen, setPassModalOpen] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Card modal
  const [cardModalOpen, setCardModalOpen] = useState(false)

  // Cancel plan modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      setEmail(user.email ?? "")

      const { data: userData } = await supabase
        .from("responsible_user")
        .select("name")
        .eq("id", user.id)
        .single()

      setName(userData?.name ?? "")
      setLoadingName(false)

      const res = await fetch("/api/subscriptions")
      if (res.ok) {
        const data = await res.json()
        setSubscriptions(Array.isArray(data) ? data : [])
      }
      setLoadingSubs(false)
    }
    load()
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleSaveName = async () => {
    if (!newName.trim()) return
    setSavingName(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const { error } = await supabase
        .from("responsible_user")
        .update({ name: newName.trim() })
        .eq("id", user.id)
      if (!error) {
        setName(newName.trim())
        setNameModalOpen(false)
        setNewName("")
        showSuccess("Nombre actualizado correctamente")
      }
    } finally {
      setSavingName(false)
    }
  }

  const closePassModal = () => {
    setPassModalOpen(false)
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
  }

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
          <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-8">PERFIL</h1>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">

            {/* LEFT COLUMN */}
            <div className="space-y-6">

              {/* Datos básicos */}
              <Card title="Datos básicos">
                {/* Email row */}
                <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <Mail className="w-6 h-6 text-[#ED3237] shrink-0" />
                  <span className="text-gray-700 font-medium text-sm break-all">
                    {email ? `Correo: ${email}` : "Cargando..."}
                  </span>
                </div>
                {/* Name row */}
                <div className="flex items-center gap-3 py-3">
                  <User className="w-6 h-6 text-[#ED3237] shrink-0" />
                  <span className="text-gray-700 font-medium text-sm flex-1">
                    {loadingName ? "Cargando..." : `Nombre: ${name}`}
                  </span>
                  <button
                    onClick={() => { setNewName(name); setNameModalOpen(true) }}
                    className="shrink-0 p-1 rounded hover:bg-gray-100 transition"
                    title="Editar nombre"
                  >
                    <EditIcon />
                  </button>
                </div>
              </Card>

              {/* Seguridad */}
              <Card title="Seguridad">
                <div className="flex items-center gap-3 py-3">
                  <Lock className="w-6 h-6 text-[#ED3237] shrink-0" />
                  <span className="text-gray-700 font-medium text-sm flex-1">Contraseña: ••••••••</span>
                  <button
                    onClick={() => setPassModalOpen(true)}
                    className="shrink-0 p-1 rounded hover:bg-gray-100 transition"
                    title="Cambiar contraseña"
                  >
                    <EditIcon />
                  </button>
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN — Suscripciones */}
            <Card title="Suscripciones">
              {loadingSubs ? (
                <p className="text-gray-400 text-center text-sm py-4">Cargando...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-gray-400 text-center text-sm py-4">No tienes suscripciones activas</p>
              ) : (
                <div className="space-y-5">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="border border-gray-100 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className="font-bold text-black text-sm">{sub.plan_name}</span>
                        <span className="text-gray-600 text-sm whitespace-nowrap">Estado: {sub.status}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-gray-600 text-sm">Cupos: {sub.slots}</span>
                        <span className="text-gray-600 text-sm font-semibold">Precio: {sub.price}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 gap-3">
                        <button
                          onClick={() => setCardModalOpen(true)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                        >
                          Cambiar tarjeta
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setCancelModalOpen(true)}
                          className="text-sm font-semibold text-[#ED3237] hover:underline transition"
                        >
                          Cancelar plan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <SideMenu />
      </div>

      {/* Success banner — fixed bottom */}
      {successMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-9998 flex items-center gap-3 bg-green-600 text-white font-bold px-6 py-3 rounded-full shadow-xl">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ====== EDIT NAME MODAL ====== */}
      <Modal
        open={nameModalOpen}
        title="Ingrese nuevo nombre"
        onClose={() => { setNameModalOpen(false); setNewName("") }}
        actions={
          <>
            <button
              onClick={handleSaveName}
              disabled={savingName || !newName.trim()}
              className={btnPrimary}
            >
              {savingName ? "Guardando..." : "Confirmar"}
            </button>
          </>
        }
      >
        <div className="mb-2">
          <label className="block text-sm font-bold mb-1.5 text-black">Nuevo nombre</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder=""
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            autoFocus
          />
        </div>
      </Modal>

      {/* ====== PASSWORD MODAL ====== */}
      <Modal
        open={passModalOpen}
        title="Configuración de contraseña"
        onClose={closePassModal}
        actions={
          <button className={btnPrimary}>Confirmar</button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5 text-black">Actual contraseña</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} placeholder="••••••••" className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5 text-black">Nueva contraseña</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} placeholder="••••••••" className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5 text-black">Repetir contraseña</label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} placeholder="••••••••" className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ====== CAMBIAR TARJETA MODAL ====== */}
      <Modal
        open={cardModalOpen}
        title="Cambiar tarjeta"
        onClose={() => setCardModalOpen(false)}
      >
        <CheckoutSuscripcion />
      </Modal>

      {/* ====== CANCELAR PLAN MODAL ====== */}
      <Modal
        open={cancelModalOpen}
        title=""
        onClose={() => setCancelModalOpen(false)}
        actions={
          <div className="flex gap-3">
            <button className="flex-1 h-14 bg-[#ED3237] text-white font-bold rounded-full border-4 border-black hover:scale-[1.02] transition">
              Sí, cancelar
            </button>
            <button
              onClick={() => setCancelModalOpen(false)}
              className="flex-1 h-14 bg-black text-white font-bold rounded-full border-4 border-white hover:scale-[1.02] transition"
            >
              No, mantener
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <Image src="/logo.png" alt="NeuroDivisión" width={80} height={80} className="object-contain" />
          <h3 className="text-xl font-extrabold text-black">¡Te vamos a extrañar!</h3>
          <p className="text-base font-bold text-black">
            ¿Estás seguro de cancelar <br />
            <span className="text-[#ED3237]">"Plan particular"</span>?
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Si cancelas ahora, no se te harán más cobros en tu tarjeta. Podrás seguir disfrutando de los beneficios de tu plan hasta el final del ciclo de facturación actual.
          </p>
        </div>
      </Modal>
    </section>
  )
}

export default function PerfilPage() {
  return (
    <ProtectedRoute>
      <PerfilContent />
    </ProtectedRoute>
  )
}
