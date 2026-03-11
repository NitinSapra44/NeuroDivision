"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAppContext } from "@/store/app-context"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const navItems = [
  { label: "PLANES DE\nSUSCRIPCIÓN", href: "/planes-suscripcion" },
  { label: "CONTACTA A\nUN PROFESIONAL", href: "/contacto" },
  { label: "NOSOTROS", href: "/nosotros" },
  { label: "CALENDARIO DE\nACTIVIDADES", href: "/calendario" },
  { label: "SOPORTE", href: "/soporte" },
]

export default function Navbar() {
  const router = useRouter()
  const { permissions } = useAppContext()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleUserClick = () => {
    if (permissions) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const handleNav = (href: string) => {
    router.push(href)
    setMenuOpen(false)
  }

  return (
    <header className="w-full bg-white relative z-50 overflow-x-hidden">

      {/* Main Navbar Container */}
      <div className="w-full mx-auto px-6 md:px-8 2xl:px-10 py-3 flex items-center justify-between">

        {/* LEFT: Logo */}
        <button onClick={() => router.push("/")} className="flex-shrink-0 hover:opacity-80 transition">
          <div className="relative h-12 md:h-16 lg:h-20 xl:h-24 2xl:h-28 w-24 md:w-32 lg:w-40 xl:w-48 2xl:w-56">
            <Image
              src="/logo.png"
              alt="Neuro Diversión Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </button>

        {/* CENTER: Navigation Links — desktop only */}
        <nav className="hidden xl:flex items-center justify-center gap-4 md:gap-6 xl:gap-8 2xl:gap-10 text-center">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="font-montserrat font-bold text-sm md:text-base xl:text-lg 2xl:text-xl leading-tight uppercase tracking-[0.02em] hover:text-red-600 transition-colors whitespace-pre-line text-center"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* RIGHT: Icons */}
        <div className="flex items-center gap-4 md:gap-6 xl:gap-8 2xl:gap-10">
          <button onClick={handleUserClick} className="hover:opacity-70 transition" title={permissions ? "Cerrar sesión" : "Iniciar sesión"}>
            <img
              src="/user.png"
              alt="user"
              className="h-9 md:h-11 lg:h-12 xl:h-14 2xl:h-16 w-9 md:w-11 lg:w-12 xl:w-14 2xl:w-16 object-contain"
            />
          </button>
          <div className="hidden sm:block relative h-10 md:h-12 lg:h-14 xl:h-16 2xl:h-20 w-24 md:w-32 lg:w-36 xl:w-44 2xl:w-52">
            <Image
              src="/rightLogo.png"
              alt="Corfo Logo"
              fill
              className="object-contain object-right"
            />
          </div>
          {/* Hamburger — mobile/tablet only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="xl:hidden p-1 hover:opacity-70 transition"
            aria-label="Menú"
          >
            {menuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* 3-Color Strip */}
      <div className="w-full h-2 md:h-3 xl:h-4 bg-gradient-to-r from-[#E11B22] via-[#FFCC00] to-[#80C342]" />

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <nav className="xl:hidden bg-white border-t border-gray-100 shadow-lg">
          <ul className="flex flex-col py-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <button
                  onClick={() => handleNav(item.href)}
                  className="w-full text-center font-montserrat font-bold text-base uppercase px-6 py-4 hover:bg-gray-50 hover:text-red-600 transition-colors leading-tight whitespace-pre-line"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

    </header>
  )
}
