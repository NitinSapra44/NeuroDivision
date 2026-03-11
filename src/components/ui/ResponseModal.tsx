"use client"

import { X, Home } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import Image from "next/image"

interface ResponseModalProps {
  open: boolean
  type: "logrado" | "porLograr"
  onClose: () => void
  onBack: () => void
  onConfirm: () => void
  confirming?: boolean
}

export default function ResponseModal({
  open,
  type,
  onClose,
  onBack,
  onConfirm,
  confirming = false,
}: ResponseModalProps) {

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !open) return null

  const portalRoot = document.getElementById("portal-root") ?? document.body
  const isSuccess = type === "logrado"

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center">

      {/* Dark Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ================= MODAL CARD ================= */}
      <div className="relative bg-[#F2F2F2] w-[92%] max-w-120 rounded-[28px] border-[5px] border-black shadow-2xl px-4 md:px-6 xl:px-8 2xl:px-10 py-6 md:py-8 xl:py-10 2xl:py-12 text-center">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6"
        >
          <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </button>

        {/* Rocket Circle */}
        <div className="flex justify-center mb-5 sm:mb-8">
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="rocket"
              width={150}
              height={150}
              className="object-contain w-24 h-24 sm:w-37.5 sm:h-37.5"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[clamp(1.5rem,2vw,2.8rem)] font-extrabold tracking-wide text-black mb-2">
          {isSuccess ? "LOGRADO" : "POR LOGRAR"}
        </h2>

        <p className="text-[clamp(1rem,1.2vw,1.5rem)] text-black mb-4 md:mb-6 xl:mb-8 2xl:mb-10 font-bold">
          SIGUIENTE ACTIVIDAD
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-4 md:gap-6 xl:gap-8 2xl:gap-10">

          {/* Continue */}
          <form onSubmit={(e) => { e.preventDefault(); onConfirm() }}>
            <button
              type="submit"
              disabled={confirming}
              className="w-full h-[clamp(52px,3vw,72px)] px-[clamp(16px,2vw,40px)] bg-[#ED3237] text-white text-[clamp(1rem,1.2vw,1.5rem)] font-bold rounded-full border-4 border-black hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
            >
              {confirming ? "Cargando..." : "Continuar"}
            </button>
          </form>

          {/* Back */}
          <button
            onClick={onBack}
            className="w-full h-[clamp(52px,3vw,72px)] px-[clamp(16px,2vw,40px)] bg-black text-white text-[clamp(1rem,1.2vw,1.5rem)] font-bold rounded-full border-4 border-white hover:scale-[1.02] transition flex items-center justify-center gap-3"
          >
            Volver
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

        </div>
      </div>
    </div>,
    portalRoot
  )
}
