"use client"

import Image from "next/image"
import { useEffect } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import SideMenu from "@/components/ui/SideMenu"

function AssessmentLayoutContent({ children }: { children: React.ReactNode }) {
  // Set the body background to match the page while mounted, prevents white flash on navigation
  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = "#5e1212"
    return () => { document.body.style.backgroundColor = prev }
  }, [])

  return (
    <section className="relative w-full min-h-[calc(100vh-130px)] font-montserrat text-white">

      {/* Background — persists across all section navigation, never reloads */}
      <div className="fixed inset-0 -z-10 bg-[#5e1212]" style={{ transform: "translate3d(0,0,0)" }}>
        <Image src="/hero.png" alt="Background" fill priority quality={100} className="object-cover object-center" />
        <div className="absolute inset-0 bg-red-600/55 backdrop-brightness-95" />
      </div>

      <div className="relative z-10 flex w-full">
        {/* Left spacer — persists, balances the right SideMenu */}
        <div className="hidden md:block w-20 xl:w-24 shrink-0" />
        <div className="flex-1">
          {children}
        </div>
        {/* SideMenu — persists across section navigation */}
        <SideMenu />
      </div>

    </section>
  )
}

export default function AssessmentInstanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AssessmentLayoutContent>{children}</AssessmentLayoutContent>
    </ProtectedRoute>
  )
}
