"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Accordion } from "@/components/ui/Accordion"
import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"
import { supabase } from "@/lib/supabase/client"

const theme = {
  colors: {
    red: "#ED3237",
    yellow: "#FCCD2A",
    orange: "#F7A931",
    green: "#76C04E",
  },
}

type PlanGroup = "particular" | "derivacion" | "aburrimiento"

type PlanRecord = {
  id: number
  duration_days: number
  price: number
  plan_group: string
}

type CardStaticProps = {
  title: string
  subTitle?: string
  list: string[]
  color: keyof typeof theme.colors
  group: PlanGroup
}

const cardStatics: CardStaticProps[] = [
  {
    title: "Plan Particular",
    subTitle: "(Por edades 4-5/6-7/8-9/10-11/12)",
    list: [
      "Plan particular sólo para 1 niño",
      "Incluye kit de material concreto que le llega al domicilio (transporte incluido)",
      "1 sesión de reunión virtual gratuita de 40 min con especialista, el adulto decide razón (solicitud de diagnóstico, dudas, peticiones de tratamiento, etc) (solo 1x etapa)",
      "Cargo extra personalización de caja Kit",
    ],
    color: "red",
    group: "particular",
  },
  {
    title: "Kit con Derivación",
    list: [
      "Plan particular sólo para 1 niño",
      "Derivación para evaluación diagnóstica con especialista",
      "Incluye kit de material concreto que le llega al domicilio (transporte incluido)",
      "1 sesión de reunión virtual gratuita de 40 min con especialista, el adulto decide razón (solicitud de diagnóstico, dudas, peticiones de tratamiento, etc) (solo 1x etapa)",
      "Cargo extra por personalización de caja Kit",
    ],
    color: "orange",
    group: "derivacion",
  },
  {
    title: "Kit de Aburrimiento",
    list: [
      "Plan particular solo para 1 niño",
      "Incluye kit de material concreto que le llega al domicilio (transporte incluido)",
      "1 sesión de reunión virtual gratuita de 40 min con especialista, el adulto decide razón (solicitud de diagnóstico, dudas, peticiones de tratamiento, etc) (solo 1x etapa)",
      "Cargo extra por personalización de caja Kit",
    ],
    color: "green",
    group: "aburrimiento",
  },
]

function formatPrice(price: number, cycleDays: number = 30) {
  const suffix = cycleDays === 180 ? "6 meses" : "mes"
  return `$ ${price.toLocaleString("es-CL")}/${suffix}`
}

function SubscriptionCard({
  title,
  subTitle,
  list,
  color,
  price,
  planId,
  cycleDays,
  onSubscribe,
}: CardStaticProps & { price?: number; planId?: number; cycleDays: number; onSubscribe: (planId: number) => void }) {
  const theColor = theme.colors[color]
  return (
    <article
      style={{ border: `2px solid ${theColor}`, boxShadow: "8px 8px 0px rgba(0,0,0,0.9)" }}
      className="bg-[#F2F2F2] flex flex-col h-full gap-4 rounded-2xl pb-4 font-montserrat"
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
      <div className="text-center font-bold text-2xl mt-4 px-4">
        {price !== undefined ? formatPrice(price, cycleDays) : <span className="text-gray-400 text-lg">Cargando...</span>}
      </div>
      <ul className="list-disc px-8 flex flex-col gap-1">
        {list.map((item, i) => (
          <li key={i} className="text-sm">{item}</li>
        ))}
      </ul>
      <button
        style={{ backgroundColor: theColor }}
        className="mt-auto mx-auto px-11 py-2.5 text-xl font-bold rounded-full border-4 border-black hover:brightness-110 hover:scale-105 transition-all duration-200"
        onClick={() => planId !== undefined && onSubscribe(planId)}
        disabled={planId === undefined}
      >
        Suscribir
      </button>
    </article>
  )
}

function InstitucionalCard({ onCotizar }: { onCotizar: () => void }) {
  const theColor = theme.colors.yellow
  return (
    <article
      style={{ border: `2px solid ${theColor}`, boxShadow: "8px 8px 0px rgba(0,0,0,0.9)" }}
      className="bg-[#F2F2F2] flex flex-col h-full gap-4 rounded-2xl pb-4 font-montserrat"
    >
      <header
        style={{ backgroundColor: theColor, minHeight: "84px", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
        className="relative text-center font-bold text-white w-full rounded-t-2xl flex flex-col items-center justify-center px-4 py-4"
      >
        <h2 className="text-xl md:text-2xl uppercase">Plan Institucional</h2>
        <h3 className="text-sm mt-1">&quot;Aulas grupales, 45 niños máximo&quot;</h3>
        <div
          style={{ borderLeft: "25px solid transparent", borderRight: "25px solid transparent", borderTop: `25px solid ${theColor}` }}
          className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-0 h-0"
        />
      </header>
      <ul className="list-disc px-8 flex flex-col gap-1 mt-6">
        <li className="text-sm">Plan para grupos (clases, jardines)</li>
        <li className="text-sm">Incluye kit de material concreto que le llega a institución (transporte incluido)</li>
        <li className="text-sm">2 sesiones de reuniones presenciales o virtuales gratuitas de 40 min con especialista, el adulto decide razón (solicitud de diagnóstico, dudas, peticiones de tratamiento, etc) (por grupo, no por niño, durante etapa completa)</li>
        <li className="text-sm">Personalización de kit incluida (color, nombre e insignia de la institución)</li>
      </ul>
      <button
        style={{ backgroundColor: theColor }}
        className="mt-auto mx-auto px-11 py-2.5 text-xl font-bold rounded-full border-4 border-black hover:brightness-110 hover:scale-105 transition-all duration-200"
        onClick={onCotizar}
      >
        Cotizar
      </button>
    </article>
  )
}

export default function PlanesSuscripcionPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [cycleDays, setCycleDays] = useState(30)
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const router = useRouter()

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1025px)")
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plan")
        .select("id, duration_days, price, plan_group")
      console.log("subscription_plan fetch:", data, error)
      if (!error && data) setPlans(data)
    }
    fetchPlans()
  }, [])

  const getPlan = (group: PlanGroup) =>
    plans.find((p) => p.plan_group === group && p.duration_days === cycleDays)

  const handleSubscribe = async (planId: number) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push(`/checkout?planId=${planId}`)
    } else {
      router.push(`/login?redirectTo=/checkout?planId=${planId}`)
    }
  }

  const handleCotizar = () => {
    const contactSection = document.getElementById("contact-form")
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <>
      <div className="w-full bg-[#ED3237] font-montserrat py-12 px-4 md:px-8">
        <h1 className="text-center font-bold uppercase text-white text-4xl md:text-5xl mb-8">
          Planes de Suscripción
        </h1>

        {/* Radio switch */}
        <div className="flex justify-center gap-4 mb-10">
          <label className={`cursor-pointer px-10 py-3 rounded-full font-bold text-lg transition-all duration-200 border-4 text-white ${cycleDays === 30 ? "border-white" : "border-transparent"}`}>
            <input
              type="radio"
              name="planCycle"
              value={30}
              checked={cycleDays === 30}
              onChange={() => setCycleDays(30)}
              className="hidden"
            />
            Plan mensual
          </label>
          <label className={`cursor-pointer px-10 py-3 rounded-full font-bold text-lg transition-all duration-200 border-4 text-white ${cycleDays === 180 ? "border-white" : "border-transparent"}`}>
            <input
              type="radio"
              name="planCycle"
              value={180}
              checked={cycleDays === 180}
              onChange={() => setCycleDays(180)}
              className="hidden"
            />
            Plan 6 meses (15% dcto)
          </label>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {cardStatics.map((card) => {
            const plan = getPlan(card.group)
            const theColor = theme.colors[card.color]

            if (isMobile) {
              return (
                <li key={card.group}>
                  <Accordion
                    summary={
                      <div className="text-center py-4 px-2 font-bold text-white text-2xl uppercase" style={{ textShadow: "0 0 2px black" }}>
                        <div>{card.title}</div>
                        {card.subTitle && <div className="text-base">{card.subTitle}</div>}
                        {plan && <div className="text-lg mt-1">{formatPrice(plan.price, cycleDays)}</div>}
                      </div>
                    }
                    body={
                      <div className="mt-4 bg-white text-black p-4 rounded-lg flex flex-col gap-6">
                        <p className="whitespace-pre-wrap font-montserrat">- {card.list.join("\n- ")}</p>
                        <button
                          style={{ backgroundColor: theColor }}
                          className="w-full rounded-full border-2 border-black font-bold text-white py-2 text-lg hover:brightness-110 hover:scale-105 transition-all duration-200"
                          onClick={() => plan && handleSubscribe(plan.id)}
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
              <li key={card.group}>
                <SubscriptionCard
                  {...card}
                  price={plan?.price}
                  planId={plan?.id}
                  cycleDays={cycleDays}
                  onSubscribe={handleSubscribe}
                />
              </li>
            )
          })}

          {/* Institutional card */}
          {isMobile ? (
            <li>
              <Accordion
                summary={
                  <div className="text-center py-4 px-2 font-bold text-white text-2xl uppercase" style={{ textShadow: "0 0 2px black" }}>
                    <div>Plan Institucional</div>
                    <div className="text-base">&quot;Aulas grupales, 45 niños máximo&quot;</div>
                  </div>
                }
                body={
                  <div className="mt-4 bg-white text-black p-4 rounded-lg flex flex-col gap-6">
                    <p className="whitespace-pre-wrap font-montserrat">
                      {`- Plan para grupos (clases, jardines)\n- Incluye kit de material concreto que le llega a institución (transporte incluido)\n- 2 sesiones de reuniones presenciales o virtuales gratuitas de 40 min con especialista\n- Personalización de kit incluida (color, nombre e insignia de la institución)`}
                    </p>
                    <button
                      style={{ backgroundColor: theme.colors.yellow }}
                      className="w-full rounded-full border-2 border-black font-bold text-white py-2 text-lg hover:brightness-110 hover:scale-105 transition-all duration-200"
                      onClick={handleCotizar}
                    >
                      Cotizar
                    </button>
                  </div>
                }
                summaryStyle={{ backgroundColor: theme.colors.yellow, boxShadow: "8px 8px 0px rgba(0,0,0,0.9)" }}
                summaryClassName="list-none rounded-2xl border-4 border-white cursor-pointer hover:bg-white hover:text-black transition-colors"
              />
            </li>
          ) : (
            <li>
              <InstitucionalCard onCotizar={handleCotizar} />
            </li>
          )}
        </ul>
      </div>
      <div id="contact-form">
        <ContactForm />
      </div>
      <Footer />
    </>
  )
}
