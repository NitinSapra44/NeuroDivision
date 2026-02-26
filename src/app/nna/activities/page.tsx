"use client"

import { Home, Bell, User } from "lucide-react"
import Image from "next/image"


export default function ActivitiesPage() {

  const activities = [
    { status: "done", label: "L" },
    { status: "locked", label: "PL" },
    { status: "locked", label: "PL" },
    { status: "locked", label: "PL" },
    { status: "done", label: "L" },
    { status: "locked", label: "PL" },
    { status: "locked", label: "PL" },
    { status: "locked", label: "PL" },
    { status: "locked", label: "PL" },
  ]

  const sidebarItems = [
    { name: "Memoria", active: true },
    { name: "Lenguaje", active: true },
    { name: "Concentración", active: false },
    { name: "Percepción", active: false },
    { name: "Psicomotricidad", active: false },
  ]

  return (
    <section className="h-full flex flex-col bg-[#F5F5F5] font-montserrat overflow-x-hidden">

      <div className="flex w-full h-full flex-col md:flex-row">

        {/* ================= LEFT SIDEBAR ================= */}
        <div className="hidden md:flex w-[clamp(240px,18vw,300px)] flex-col items-center pt-12 border-r border-gray-200">

          <div className="w-28 h-28 rounded-full bg-[#ED3237] flex items-center justify-center">
            <User className="w-14 h-14 text-white" />
          </div>

          <h2 className="text-[#ED3237] text-[clamp(24px,2.5vw,48px)] font-bold mt-4">
            Rodrigo
          </h2>

          <div className="mt-10 w-full px-4">
            <div className="flex flex-col gap-0 space-y-8">
              {sidebarItems.map((item, i) => (
                <div key={i} className={`flex flex-col items-center ${!item.active && "opacity-40"}`}>
                  <span className={`${item.active ? "text-[#ED3237]" : "text-gray-400"} text-4xl`}>★</span>
                  <p className={`${item.active ? "text-[#ED3237]" : "text-gray-600"} text-[10px] sm:text-xs font-bold mt-1 uppercase`}>
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 h-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-10 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          <div className="relative flex items-center justify-center mb-8 md:mb-12">

            {/* Left Home Icon */}
            <div className="absolute left-0">
              <Home className="w-8 h-8 md:w-12 md:h-12 text-[#ED3237]" />
            </div>

            {/* Title */}
            <h1 className="text-[clamp(24px,2.5vw,48px)] font-bold text-black">
              Actividades: Memoria
            </h1>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,2vw,48px)] justify-items-center">

            {activities.map((item, index) =>
              <div key={index} className="flex flex-col items-center w-full">

                <div
                  className={`w-full max-w-[288px] h-32 sm:h-36 md:h-40 rounded-[6px] border-[3px] border-black flex items-center justify-center ${
                    item.status === "done"
                      ? "bg-[#7BC043]"
                      : "bg-[#F02E2E]"
                  }`}
                >
                  <Image
                    src="/Vector.png"
                    alt="Rocket"
                    width={90}
                    height={90}
                    className="object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-[90px] md:h-[90px]"
                  />
                </div>

                <p className="text-[clamp(20px,1.8vw,36px)] mt-2 font-light">
                  {item.label}
                </p>

              </div>
            )}

          </div>

        </div>

        {/* ================= RIGHT ICONS — desktop only ================= */}
        <div className="hidden md:flex w-[clamp(70px,6vw,100px)] flex-col items-center pt-12 space-y-14">

          <Home className="w-12 h-12 text-black stroke-[1.5]" />

          <div className="relative">
            <Bell className="w-12 h-12 text-black stroke-[1.5]" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ED3237] text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
              9
            </span>
          </div>

          <User className="w-12 h-12 text-black stroke-[1.5]" />

        </div>

      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-white border-t border-gray-200 flex justify-around items-center z-20">
        <Home className="w-6 h-6 text-black" />
        <div className="relative">
          <Bell className="w-6 h-6 text-black" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ED3237] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            9
          </span>
        </div>
        <User className="w-6 h-6 text-black" />
      </div>

    </section>
  )
}
