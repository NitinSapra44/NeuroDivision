"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"

export default function CheckoutSuscripcion() {
  const [cardNumber, setCardNumber] = useState("")
  const [cardHolder, setCardHolder] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [showCvv, setShowCvv] = useState(false)
  const [docNumber, setDocNumber] = useState("")
  const [email, setEmail] = useState("")

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16)
    return digits.replace(/(.{4})/g, "$1 ").trim()
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4)
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return digits
  }

  return (
    <div className="space-y-3">
      {/* Card brand logos */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Tarjeta de crédito o débito
        </span>
        <div className="flex gap-1 ml-auto">
          <div className="w-8 h-5 bg-blue-700 rounded text-white text-[8px] font-bold flex items-center justify-center">VISA</div>
          <div className="w-8 h-5 bg-red-600 rounded text-white text-[8px] font-bold flex items-center justify-center">MC</div>
          <div className="w-8 h-5 bg-blue-400 rounded text-white text-[8px] font-bold flex items-center justify-center">MP</div>
        </div>
      </div>

      {/* Card number */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-gray-600">Número de tarjeta</label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="1234 1234 1234 1234"
          maxLength={19}
          className={inputClass}
        />
      </div>

      {/* Expiry + CVV */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">Vencimiento</label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/AA"
            maxLength={5}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">Código de seguridad</label>
          <div className="relative">
            <input
              type={showCvv ? "text" : "password"}
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Ej. 123"
              maxLength={4}
              className={inputClass + " pr-8"}
            />
            <button
              type="button"
              onClick={() => setShowCvv(!showCvv)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Card holder */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-gray-600">
          Nombre del titular como aparece en la tarjeta
        </label>
        <input
          type="text"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          placeholder="María López"
          className={inputClass}
        />
      </div>

      {/* Document */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-gray-600">Documento por titular</label>
        <input
          type="text"
          value={docNumber}
          onChange={(e) => setDocNumber(e.target.value)}
          placeholder="RUT - 999999999"
          className={inputClass}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-gray-600">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ejemplo@email.com"
          className={inputClass}
        />
      </div>

      {/* Pay button */}
      <button
        type="button"
        className="w-full h-10 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition mt-1"
      >
        Pagar
      </button>
    </div>
  )
}
