"use client"
import { Accordion } from "@/components/ui/Accordion"
import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"
import { useState, useEffect } from "react"

const theme = {
  colors: {
    red: "#ED3237",
    yellow: "#FCCD2A",
    orange: "#F7A931",
    lemon: "#DDCA36",
    green: "#76C04E",
  },
}

type CardProps = {
  title: string
  subTitle?: string
  list: string[]
  color: keyof typeof theme.colors
}

const cards: CardProps[] = [
  {
    title: "Plan particular",
    subTitle: "(Por edades 4-5/6-7/8-9/10-11/12)",
    list: [
      "Plan particular sólo para 1 niño",
      "1 etapa por suscripción (6 meses, pero si no termina en ese tiempo, la suscripción se prolonga hasta completar la etapa)",
      "Incluye kit de material concreto, que le llega al domicilio (transporte incluido)",
      "1 sesión de reunión virtual gratuita de 40 min con especialista (solo 1 x etapa)",
      "Cargo extra personalización de caja Kit",
    ],
    color: "red",
  },
  {
    title: "Plan Institucional",
    subTitle: "Aulas grupales, 45 niños máximo",
    list: [
      "Plan para grupos (clases, jardines)",
      "1 etapa por suscripción (6 meses, pero si no termina en ese tiempo, la suscripción se prolonga hasta completar la etapa)",
      "Incluye kit de material concreto que le llega a institución (transporte incluido)",
      "2 sesiones de reuniones presenciales o virtuales gratuitas de 40 min con especialista",
      "Personalización de kit incluida (color, nombre e insignia de la institución)",
    ],
    color: "yellow",
  },
  {
    title: "Kit con derivación",
    list: [
      "Plan particular sólo para 1 niño",
      "Derivación para evaluación diagnóstica con especialista",
      "1 etapa por suscripción (6 meses, pero si no termina en ese tiempo, la suscripción se prolonga hasta completar la etapa)",
      "Incluye kit de material concreto que le llega al domicilio (transporte incluido)",
      "1 sesión de reunión virtual gratuita de 40 min con especialista (solo 1 x etapa)",
      "Cargo extra por personalización de caja Kit",
    ],
    color: "orange",
  },
  {
    title: "Kit de aburrimiento",
    list: [
      "Plan particular solo para 1 niño",
      "Etapa por suscripción con duración de 1 año",
      "Incluye kit de material concreto que le llega al domicilio (transporte incluido)",
      "1 sesión de reunión virtual gratuita de 40 min con especialista (solo 1 x etapa)",
      "Cargo extra por personalización de caja Kit",
    ],
    color: "green",
  },
]

function SubscriptionCard({ title, subTitle, list, color }: CardProps) {
  const theColor = theme.colors[color]
  return (
    <article
      style={{ border: `2px solid ${theColor}`, boxShadow: "8px 8px 0px rgba(0,0,0,0.9)" }}
      className="bg-[#F2F2F2] flex flex-col h-full gap-7 rounded-2xl pb-4 font-montserrat"
    >
      <header
        style={{ backgroundColor: theColor, minHeight: "84px", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
        className="relative text-center font-bold text-white w-full rounded-t-2xl flex flex-col items-center justify-center px-4 py-4"
      >
        <h2 className="text-xl md:text-2xl uppercase">{title}</h2>
        {subTitle && <h3 className="text-sm mt-1">{subTitle}</h3>}
        <div
          style={{ borderLeft: "25px solid transparent", borderRight: "25px solid transparent", borderTop: `25px solid ${theColor}` }}
          className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-0 h-0"
        />
      </header>
      <ul className="list-disc px-8 flex flex-col gap-1 mt-2">
        {list.map((item, i) => (
          <li key={i} className="text-sm">{item}</li>
        ))}
      </ul>
      <button
        style={{ backgroundColor: theColor }}
        className="mt-auto mx-auto px-11 py-2.5 text-xl font-bold rounded-full border-4 border-black"
      >
        Suscribir
      </button>
    </article>
  )
}

export default function PlanesSuscripcionPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1025px)")
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return (
    <>
    <div className="w-full bg-black font-montserrat py-12 px-4 md:px-8">
      <h1 className="text-center font-bold uppercase text-white text-4xl md:text-5xl mb-8">
        Planes de Suscripción
      </h1>

      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {cards.map((card) => {
          const theColor = theme.colors[card.color]
          if (isMobile) {
            return (
              <li key={card.title}>
                <Accordion
                  summary={
                    <div className="text-center py-4 px-2 font-bold text-white text-2xl uppercase" style={{ textShadow: "0 0 2px black" }}>
                      <div>{card.title}</div>
                      {card.subTitle && <div className="text-base">{card.subTitle}</div>}
                    </div>
                  }
                  body={
                    <div className="mt-4 bg-white text-black p-4 rounded-lg flex flex-col gap-6">
                      <p className="whitespace-pre-wrap font-montserrat">- {card.list.join("\n- ")}</p>
                      <button
                        style={{ backgroundColor: theColor }}
                        className="w-full rounded-full border-2 border-black font-bold text-white py-2 text-lg"
                      >
                        Suscribir
                      </button>
                    </div>
                  }
                  summaryStyle={{ backgroundColor: theColor, boxShadow: "8px 8px 0px rgba(0,0,0,0.9)" }}
                  summaryClassName="list-none rounded-2xl border-4 border-white cursor-pointer hover:bg-white hover:text-black transition-colors"
                />
              </li>
            )
          }
          return (
            <li key={card.title}>
              <SubscriptionCard {...card} />
            </li>
          )
        })}
      </ul>
    </div>
    <ContactForm />
    <Footer />
    </>
  )
}
