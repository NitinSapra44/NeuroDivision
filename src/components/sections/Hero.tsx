// "use client"

// import Image from "next/image"
// import { User, Bell, Home } from "lucide-react"

// export default function Hero() {
//   return (
//     <section className="relative w-full h-screen overflow-hidden bg-black text-white font-montserrat">

//       {/* ================= BACKGROUND ================= */}
//       <div className="absolute inset-0">
//         <Image
//           src="/hero.png"
//           alt="Hero Background"
//           fill
//           priority
//           quality={100}
//           className="object-cover object-center"
//         />
//         <div className="absolute inset-0 bg-red-600/50 backdrop-brightness-95" />
//       </div>

//       {/* ================= CONTENT ================= */}
//       <div className="relative z-10 h-full w-full flex flex-col">

//         {/* CENTER CONTENT */}
//         <div className="flex flex-col items-center 
//                         pt-8 md:pt-10 
//                         text-center px-6 w-full max-w-6xl mx-auto">

//           {/* BUTTON - Higher + Longer */}
//           <button
//             className="bg-black text-white rounded-full
//                        border-[3px] border-white
//                        w-full max-w-[1200px]
//                        py-3 md:py-4
//                        text-lg md:text-xl lg:text-2xl
//                        font-bold tracking-tight
//                        shadow-2xl"
//           >
//             Ingresar alumno
//           </button>

//           {/* TITLE - Slightly Smaller */}
//           <h2 className="mt-16 text-white font-bold
//                          text-lg md:text-xl lg:text-2xl">
//             Alumnos registrados (0/2)
//           </h2>

//           {/* SUBTITLE - Bigger */}
//           <p className="mt-12 text-white
//                         text-xl md:text-2xl lg:text-3xl
//                         font-medium">
//             No hay registros de alumnos propios
//           </p>
//         </div>

//         {/* RIGHT FLOATING ICONS - Up + Slightly Left */}
//         <div className="hidden md:flex absolute right-24 top-14 
//                         flex-col space-y-6 items-center">

//           <Home className="w-12 h-12 text-white" />

//           <div className="relative">
//             <Bell className="w-12 h-12 text-white" />
//             <span className="absolute -top-1 -right-1 w-4 h-4 
//                              border-2 border-white rounded-full 
//                              flex items-center justify-center 
//                              bg-white/20 text-[9px] font-black">
//               9
//             </span>
//           </div>

//           <User className="w-12 h-12 text-white" />
//         </div>

//       </div>
//     </section>
//   )
// }
"use client"

import Image from "next/image"
import { User, Bell, Home } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative w-full h-[100dvh] overflow-hidden bg-black text-white font-montserrat">

      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0">
        <Image
          src="/hero.png"
          alt="Hero Background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-red-600/50 backdrop-brightness-95" />
      </div>

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 h-full w-full flex flex-col overflow-hidden">

        {/* CENTER CONTENT */}
        <div className="flex flex-col items-center 
                        pt-8 md:pt-10 
                        text-center px-6 w-full max-w-6xl mx-auto">

          <button
            className="bg-black text-white rounded-full
                       border-[3px] border-white
                       w-full max-w-[1200px]
                       py-3 md:py-4
                       text-lg md:text-xl lg:text-2xl
                       font-bold tracking-tight
                       shadow-2xl"
          >
            Ingresar alumno
          </button>

          <h2 className="mt-16 text-white font-bold
                         text-lg md:text-xl lg:text-2xl">
            Alumnos registrados (0/2)
          </h2>

          <p className="mt-12 text-white
                        text-xl md:text-2xl lg:text-3xl
                        font-medium">
            No hay registros de alumnos propios
          </p>
        </div>

        {/* RIGHT FLOATING ICONS */}
        <div className="hidden md:flex absolute right-24 top-14 
                        flex-col space-y-6 items-center">

          <Home className="w-12 h-12 text-white" />

          <div className="relative">
            <Bell className="w-12 h-12 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 
                             border-2 border-white rounded-full 
                             flex items-center justify-center 
                             bg-white/20 text-[9px] font-black">
              9
            </span>
          </div>

          <User className="w-12 h-12 text-white" />
        </div>

      </div>
    </section>
  )
}
