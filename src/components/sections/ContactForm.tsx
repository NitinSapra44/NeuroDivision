"use client"

import { Mail, User } from "lucide-react"
import { useState, useRef, useEffect, SyntheticEvent } from "react"

const requestTypes = ["Información", "Diagnóstico", "Tratamiento", "Otro"]

export default function ContactForm() {
  const [isSelectOpen, setSelectOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState("Información")
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setSelectOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
  }

  return (
    <section className="w-full bg-[#FCCD2A] font-montserrat py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
      <h2 className="text-center font-bold uppercase text-black text-4xl md:text-5xl mb-8">
        Contáctanos
      </h2>

      <form className="max-w-full mx-auto flex flex-col gap-2 text-lg font-bold">

        {/* Nombre */}
        <div className="flex flex-col gap-1">
          <label className="text-center">Nombre</label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-gray-400">
              <User className="w-6 h-6" />
            </span>
            <input
              type="text"
              placeholder="Rodrigo Andrés Tapia Jensen"
              className="w-full rounded-full border-2 border-black bg-white pl-12 pr-4 py-3 text-base font-normal placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* Correo */}
        <div className="flex flex-col gap-1">
          <label className="text-center">Correo</label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-gray-400">
              <Mail className="w-6 h-6" />
            </span>
            <input
              type="email"
              placeholder="r.tapia.jensen@gmail.com"
              className="w-full rounded-full border-2 border-black bg-white pl-12 pr-4 py-3 text-base font-normal placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* Tipo de solicitud */}
        <div className="flex flex-col gap-1" ref={selectRef}>
          <label className="text-center">Tipo de solicitud</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectOpen((v) => !v)}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-black text-white py-3 px-6 text-base font-bold border-2 border-black"
            >
              {selectedValue}
              <svg
                className={`w-5 h-5 transition-transform ${isSelectOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isSelectOpen && (
              <ul className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border-2 border-black rounded-2xl overflow-hidden z-10">
                {requestTypes.map((opt) => (
                  <li
                    key={opt}
                    onClick={() => { setSelectedValue(opt); setSelectOpen(false) }}
                    className="py-3 px-6 text-center text-base font-bold cursor-pointer hover:bg-gray-100 transition"
                  >
                    {opt}
                  </li>
                ))}
              </ul>
            )}
            <input type="hidden" value={selectedValue} />
          </div>
        </div>

        {/* Mensaje */}
        <div className="flex flex-col gap-1">
          <label className="text-center">Mensaje</label>
          <textarea
            placeholder="Cuéntanos cómo podemos ayudarte"
            rows={4}
            className="w-full rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-normal placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        {/* Enviar */}
        <button
          type="submit"
          onClick={handleSubmit}
          className="w-full rounded-full bg-black text-white py-4 text-xl font-bold border-2 border-white hover:bg-white hover:text-black hover:border-black transition"
        >
          Enviar
        </button>

      </form>
      </div>
    </section>
  )
}
