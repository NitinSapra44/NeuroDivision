"use client"

import { Home, Bell, User, Play } from "lucide-react"
import ResponseModal from "@/components/ui/ResponseModal"
import { useState } from "react"


export default function ActivityView() {

const [modalOpen, setModalOpen] = useState(false)
const [resultType, setResultType] = useState<"logrado" | "porLograr">("logrado")

  return (
    <section className="h-full flex flex-col bg-[#F2F2F2] font-montserrat overflow-x-hidden">

      <div className="flex w-full h-full flex-col md:flex-row">

        {/* ================= LEFT SIDEBAR ================= */}
        <div className="hidden md:flex w-[clamp(240px,18vw,300px)] flex-col items-center pt-12 border-r border-gray-200">

          <div className="w-28 h-28 rounded-full bg-[#ED3237] flex items-center justify-center">
            <User className="w-14 h-14 text-white" />
          </div>

          <h2 className="text-[#ED3237] text-[clamp(24px,2.5vw,48px)] font-bold mt-4">
            Usuario
          </h2>

          <div className="mt-12 space-y-8 text-center text-base">

            <div>
              <div className="text-[#ED3237] text-4xl">★</div>
              <p className="text-[#ED3237] font-semibold">Memoria</p>
            </div>

            <div>
              <div className="text-[#ED3237] text-4xl">★</div>
              <p className="text-[#ED3237] font-semibold">Lenguaje</p>
            </div>

            <div className="opacity-40">
              <div className="text-gray-400 text-4xl">★</div>
              <p className="text-gray-600 font-semibold">Concentración</p>
            </div>

            <div className="opacity-40">
              <div className="text-gray-400 text-4xl">★</div>
              <p className="text-gray-600 font-semibold">Percepción</p>
            </div>

          </div>
        </div>


        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 h-full w-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-12 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          {/* TITLE (hide on mobile if needed) */}
          <div className="hidden md:flex relative items-center justify-center mb-10">
            <div className="absolute left-0">
              <Home className="w-10 h-10 text-[#ED3237]" />
            </div>
            <h1 className="text-[clamp(24px,2.5vw,48px)] font-bold">
              Actividad
            </h1>
          </div>

          {/* VIDEO + TEXT */}
          <div className="flex flex-col md:flex-row gap-[clamp(16px,2vw,48px)] items-start">

            {/* VIDEO BOX */}
            <div className="w-full md:flex-1 h-64 md:h-80 bg-[#ED3237] rounded-2xl border-[3px] border-black flex items-center justify-center">

              <div className="w-28 h-28 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center">
                <Play className="w-12 h-12 md:w-16 md:h-16 text-[#ED3237]" fill="#ED3237" />
              </div>

            </div>

            {/* RIGHT TEXT BLOCK */}
            <div className="w-full md:max-w-[420px] mt-6 md:mt-0">

              <h2 className="text-[clamp(16px,1.2vw,22px)] font-bold mb-2 md:mb-3 text-right">
                OBJETIVO:
              </h2>

              <p className="text-gray-700 text-[clamp(14px,1vw,18px)] leading-relaxed mb-6 md:mb-8">
                Construir palabras a partir de los grupos presentados utilizando
                las letras de madera para ir mejorando la conciencia fonológica
                y la función simbólica.
              </p>

              <h2 className="text-[clamp(16px,1.2vw,22px)] font-bold mb-2 md:mb-3 text-right">
                INSTRUCCIONES:
              </h2>

              <p className="text-gray-700 text-[clamp(14px,1vw,18px)] leading-relaxed">
                Busca en tu Kit NeuroDiversión los animales y las letras de madera.
                Identifica cada animal repite su nombre y repasa el sonido de cada letra.
                ¿Recuerdas alguna canción con animales? ¡Cántala!
                Ahora toma un animal y escogiendo las letras correctas, escribe su nombre.
                Hazlo con cada animal.
              </p>

            </div>

          </div>


          {/* QUESTION */}
          <div className="mt-12 md:mt-24 text-center">
            <p className="text-[clamp(16px,1.2vw,22px)] text-gray-800 mb-4">
              ¿Es capaz de realizar al menos el 50% de la actividad de manera acertada?
            </p>

            <div className="flex justify-center gap-[clamp(16px,2vw,48px)] flex-wrap">

              <button 
               onClick={() => {
    setResultType("logrado")
    setModalOpen(true)
  }}

              className="h-[clamp(48px,3.5vw,64px)] px-[clamp(16px,2vw,40px)] bg-[#80C342] text-white text-[clamp(16px,1.2vw,22px)] font-bold rounded-full border-[3px] border-black cursor-pointer">
                Logrado
              </button>

              <button
             onClick={() => {
    setResultType("porLograr")
    setModalOpen(true)
  }}

              className="h-[clamp(48px,3.5vw,64px)] px-[clamp(16px,2vw,40px)] bg-[#848688] text-white text-[clamp(16px,1.2vw,22px)] font-bold rounded-full border-[3px] border-black">
                Por lograr
              </button>

            </div>

          </div>

          {/* CONFIRM BUTTON */}
          <div className="mt-8 mb-20 md:mb-0">
            <button className="w-full h-[clamp(48px,3.5vw,64px)] px-[clamp(16px,2vw,40px)] bg-[#ED3237] text-white text-[clamp(16px,1.2vw,22px)] font-bold rounded-full border-[3px] border-black">
              Confirmar
            </button>
          </div>

        </div>


        {/* ================= RIGHT ICONS ================= */}
        <div className="hidden md:flex w-[clamp(70px,6vw,100px)] flex-col items-center pt-16 space-y-16">

          <Home className="w-12 h-12 text-black" />

          <div className="relative">
            <Bell className="w-12 h-12 text-black" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ED3237] text-white text-xs rounded-full flex items-center justify-center">
              9
            </span>
          </div>

          <User className="w-12 h-12 text-black" />

        </div>

      </div>


      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t flex justify-around items-center">

        <Home className="w-6 h-6 text-black" />

        <div className="relative">
          <Bell className="w-6 h-6 text-black" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ED3237] text-white text-[10px] rounded-full flex items-center justify-center">
            9
          </span>
        </div>

        <User className="w-6 h-6 text-black" />
<ResponseModal
  open={modalOpen}
  type={resultType}
  onClose={() => setModalOpen(false)}
/>
      </div>

    </section>
  )
}
