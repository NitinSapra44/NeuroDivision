"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import Footer from "@/components/sections/Footer"
import Link from "next/link"
import comunasData from "@/data/comunas-regiones.json"
import CheckoutSuscripcion from "@/components/CheckoutSuscripcion"

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  // Sync display when value resets externally
  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If user typed something that doesn't match the current value, reset display
        if (!options.includes(query)) setQuery(value)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [query, value, options])

  const select = (opt: string) => {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border-2 border-gray-300 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border-2 border-gray-300 rounded-2xl shadow-lg text-sm">
          {filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => select(opt)}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${opt === value ? "font-semibold" : ""}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type PlanData = {
  id: number
  name: string
  duration_days: number
  price: number
  mp_preapproval_plan_id: string | null
  discount_percentage: number
}

function formatPrice(value: number) {
  return `$ ${value.toLocaleString("es-CL")}`
}

function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("planId")

  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)

  const [street, setStreet] = useState("")
  const [apt, setApt] = useState("")
  const [region, setRegion] = useState("")
  const [comuna, setComuna] = useState("")
  const [phone, setPhone] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [slots, setSlots] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load plan from DB
  useEffect(() => {
    if (!planId) {
      router.replace("/planes-suscripcion")
      return
    }
    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from("subscription_plan")
        .select("id, name, duration_days, price, mp_preapproval_plan_id, discount_percentage")
        .eq("id", planId)
        .single()
      if (error || !data) {
        router.replace("/planes-suscripcion")
        return
      }
      setPlan(data)
      setLoadingPlan(false)
    }
    fetchPlan()
  }, [planId, router])

  // Protect route — must be logged in
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?redirectTo=/checkout?planId=${planId}`)
      }
    }
    check()
  }, [planId, router])

  const discount = plan ? plan.discount_percentage ?? 0 : 0
  const subtotal = plan ? plan.price * slots : 0
  const discountAmount = Math.round(subtotal * (discount / 100))
  const total = subtotal - discountAmount

  const planLabel = plan
    ? `${plan.name} (Plan ${plan.duration_days === 30 ? "mensual" : "6 meses"})`
    : ""

  const handleMPSubmit = async (formData: any) => {
    setError(null)

    if (!street.trim()) { setError("Por favor ingrese la calle y número"); return }
    if (!region.trim()) { setError("Por favor ingrese la región"); return }
    if (!comuna.trim()) { setError("Por favor ingrese la comuna"); return }
    if (!phone.trim()) { setError("Por favor ingrese el teléfono de contacto"); return }
    if (!termsAccepted) { setError("Debe aceptar los términos y condiciones"); return }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      const res = await fetch("/api/suscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: formData.token,
          plan_id: plan?.mp_preapproval_plan_id,
          payer_email: user?.email,
          shipping: { street, apt, region, comuna, phone },
          user_id: user?.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al procesar el pago")

      router.push("/checkout/success")
    } catch (err: any) {
      setError(err.message || "Error al procesar el pago")
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-[#ED3237] flex items-center justify-center font-montserrat">
        <p className="text-white text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#ED3237] font-montserrat">
        <div className="max-w-350 mx-auto px-8 py-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-10 uppercase text-white">
            Finalizar Compra
          </h1>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row gap-6">
            {/* ===== LEFT COLUMN ===== */}
            <div className="flex-1 flex flex-col gap-6">
              <section className="bg-white rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">
                  1.- Datos de envío (Para tu kit Neurodiversión)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Calle y número</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      </span>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Av. Ejemplo 123"
                        className="w-full border-2 border-gray-300 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Dpto / Casa (Opcional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
                      </span>
                      <input
                        type="text"
                        value={apt}
                        onChange={(e) => setApt(e.target.value)}
                        placeholder="Dpto 4B"
                        className="w-full border-2 border-gray-300 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Región</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      </span>
                      <SearchableSelect
                        options={comunasData.regiones.map((r) => r.region)}
                        value={region}
                        onChange={(val) => { setRegion(val); setComuna("") }}
                        placeholder="Selecciona una región"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Comuna</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      </span>
                      <SearchableSelect
                        options={comunasData.regiones.find((r) => r.region === region)?.comunas ?? []}
                        value={comuna}
                        onChange={setComuna}
                        placeholder="Selecciona una comuna"
                        disabled={!region}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold mb-1 block">Teléfono de contacto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="w-full border-2 border-gray-300 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="mt-5 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span
                      onClick={() => setTermsAccepted(!termsAccepted)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${termsAccepted ? "bg-[#ED3237] border-[#ED3237]" : "border-gray-400 bg-white"}`}
                    >
                      {termsAccepted && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                    </span>
                    <span className="text-sm">
                      He leído y acepto los términos y condiciones:{" "}
                      <Link href="/terminos-condiciones" target="_blank" className="text-[#ED3237] underline font-semibold">
                        Términos y condiciones
                      </Link>
                    </span>
                  </label>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">2.- Método de pago</h2>
                <CheckoutSuscripcion
                  planId={plan?.mp_preapproval_plan_id ?? ""}
                  monto={total}
                  onSubmit={handleMPSubmit}
                />
              </section>

              {error && (
                <div className="bg-red-100 text-red-700 border border-red-300 rounded-xl p-3 text-sm font-semibold">
                  {error}
                </div>
              )}
            </div>

            {/* ===== RIGHT COLUMN — ORDER SUMMARY ===== */}
            <div className="w-full lg:w-96 shrink-0">
              <div className="bg-white rounded-2xl p-6 sticky top-6">
                <h2 className="font-bold text-lg mb-4 text-center">Resumen de tu orden</h2>

                {/* Slots counter */}
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">· Cantidad de cupos</p>
                  <div className="flex items-center justify-center border-2 border-gray-300 rounded-full overflow-hidden w-40 mx-auto">
                    <button
                      type="button"
                      onClick={() => setSlots((s) => Math.max(1, s - 1))}
                      className="px-5 py-2 text-xl font-bold hover:bg-gray-100 transition"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center font-bold text-lg">{slots}</span>
                    <button
                      type="button"
                      onClick={() => setSlots((s) => s + 1)}
                      className="px-5 py-2 text-xl font-bold hover:bg-gray-100 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Plan description */}
                <div className="text-sm space-y-1 mb-6">
                  <div className="flex justify-between">
                    <span>· {planLabel}</span>
                    <span className="font-semibold">{plan ? formatPrice(plan.price) : ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>· Descuento</span>
                    <span className="font-semibold">{discount > 0 ? `- ${discount}%` : "$ 0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>· Envío Kit Material</span>
                    <span className="font-semibold">Gratis</span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 border-gray-300 pt-4 flex justify-between font-extrabold text-base mb-6">
                  <span>TOTAL A PAGAR</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <div className="text-xs text-gray-500 space-y-2 mb-6">
                  <p>
                    <strong>Envío del Kit:</strong> Despachamos vía Starken/Chilexpress en 2-3 días hábiles.
                    Te enviaremos el número de seguimiento a tu correo.
                  </p>
                  <p>
                    <strong>Acceso digital:</strong> Inmediato apenas se confirme el pago.
                  </p>
                </div>

              </div>
            </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#ED3237] flex items-center justify-center font-montserrat">
        <p className="text-white text-lg">Cargando...</p>
      </div>
    }>
      <CheckoutPage />
    </Suspense>
  )
}
