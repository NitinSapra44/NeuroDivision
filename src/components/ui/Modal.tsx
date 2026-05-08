"use client"

import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function Modal({ open, title, onClose, children, actions }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !open) return null

  const portalRoot = document.getElementById("portal-root") ?? document.body

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#F2F2F2] w-[92%] max-w-md rounded-[28px] border-[5px] border-black shadow-2xl px-6 md:px-8 py-8 md:py-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6"
        >
          <X className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h2 className="text-2xl font-extrabold text-center text-black mb-6 pr-8">{title}</h2>
        <div>{children}</div>
        {actions && <div className="mt-6 flex flex-col gap-3">{actions}</div>}
      </div>
    </div>,
    portalRoot
  )
}
