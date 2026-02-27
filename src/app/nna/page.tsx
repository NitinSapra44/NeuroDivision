

"use client"

import { Home, Bell, User } from "lucide-react"

export default function NnaMainView() {

  const cards = [
    { title: "Memoria", color: "bg-[#9B69C2]", progress: "22%" },
    { title: "Lenguaje", color: "bg-[#BCA9CE]", progress: "38%" },
    { title: "Concentración", color: "bg-[#A366FF]", progress: "15%" },
    { title: "Percepción", color: "bg-[#5C66FF]", progress: "20%" },
  ]

  const graphData = [
    { label: "M", height: "55%" },
    { label: "L", height: "80%" },
    { label: "C", height: "60%" },
    { label: "Pe", height: "82%" },
    { label: "Ps", height: "92%" },
  ]

  const sidebarItems = [
    { name: "Memoria", active: true },
    { name: "Lenguaje", active: true },
    { name: "Concentración", active: false },
    { name: "Percepción", active: false },
    { name: "Psicomotricidad", active: false },
  ]

  return (
    <section className="h-full flex flex-col bg-[#FEFEFE] font-montserrat overflow-x-hidden">

      <div className="flex w-full h-full flex-col md:flex-row">

        {/* LEFT SIDEBAR */}
        <div className="hidden md:flex w-[clamp(240px,18vw,300px)] flex-col items-center pt-12 border-r border-gray-100">

          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-[#ED3237] flex items-center justify-center shadow-sm">
            <User className="w-10 h-10 lg:w-14 lg:h-14 text-white" />
          </div>

          <h2 className="text-[#ED3237] text-[clamp(24px,2.5vw,48px)] font-bold mt-4 tracking-tight">
            Rodrigo
          </h2>

          <div className="mt-10 w-full px-4">
            <div className="flex flex-col gap-0 space-y-8">
              {sidebarItems.map((item, i) => (
                <div key={i} className={`flex flex-col items-center ${!item.active && "opacity-40"}`}>
                  <span className={`text-4xl leading-none ${item.active ? "text-[#ED3237]" : "text-gray-400"}`}>★</span>
                  <p className={`text-[10px] sm:text-xs font-bold mt-1 uppercase tracking-tighter ${item.active ? "text-[#ED3237]" : "text-gray-600"}`}>
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* MAIN CONTENT */}
        <div className="flex-1 h-full px-[clamp(16px,3vw,80px)] pt-6 md:pt-8 pb-24 md:pb-8 overflow-auto overflow-x-hidden">

          {/* GRAPH */}
          <div className="flex justify-center mb-8 md:mb-12">
            <div className="w-full max-w-[820px] relative">
              <div className="h-32 sm:h-40 md:h-44 border-l-[1.5px] border-b-[1.5px] border-black/40 flex items-end justify-between px-[clamp(16px,3vw,80px)]">

                {/* Visual connecting line (simplified SVG) */}
                <svg className="absolute inset-0 w-full h-full px-[clamp(16px,3vw,80px)] pb-1 pointer-events-none">
                  <polyline
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    points="40,90 140,40 250,70 360,35 470,20"
                  />
                </svg>

                {graphData.map((item, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full z-10">
                    <div
                      className="w-4 sm:w-6 md:w-7 bg-[#A5B4FC] transition-all"
                      style={{ height: item.height }}
                    />
                    <span className="absolute -bottom-7 text-[10px] sm:text-xs font-bold text-gray-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,2vw,48px)] mt-8 md:mt-0">

            {cards.map((item, index) => (
              <div key={index} className="flex flex-col items-center">

                <div
                  className={`w-full h-24 sm:h-32 md:h-40 rounded-[20px] border-[3.5px] border-black ${item.color}`}
                />

                <div className="w-full h-5 sm:h-6 md:h-7 bg-black mt-2 md:mt-3 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-[#F5D14E]"
                    style={{ width: item.progress }}
                  />
                </div>

                <h3 className="text-[clamp(20px,1.8vw,36px)] mt-2 md:mt-3 font-light text-black leading-none">
                  {item.title}
                </h3>

              </div>
            ))}

          </div>

        </div>


        {/* RIGHT ICONS — desktop only */}
        <div className="hidden md:flex w-[clamp(70px,6vw,100px)] flex-col items-center pt-12 space-y-12">

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
