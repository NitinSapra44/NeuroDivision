import Image from "next/image"
import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"

const theme = {
  colors: {
    red: "#ED3237",
    orange: "#F7A931",
    yellow: "#FCCD2A",
    lemon: "#DDCA36",
    green: "#76C04E",
  },
}

type CardProps = {
  title: string
  titleColor: keyof typeof theme.colors
  p: string
}

const cards: CardProps[] = [
  {
    title: "Sobrediagnóstico",
    titleColor: "red",
    p: "Al prevenir evitamos un posible diagnóstico innecesario",
  },
  {
    title: "Tiempo",
    titleColor: "orange",
    p: "Nos ahorramos el tiempo de un posible tratamiento futuro",
  },
  {
    title: "Economía",
    titleColor: "yellow",
    p: "Las intervenciones y tratamientos de Trastornos Educativos son costosas y pueden llegar a durar varios años",
  },
  {
    title: "Enfoque",
    titleColor: "lemon",
    p: "Nos permite visibilizar los casos realmente necesarios y entregar atención especializada y focalizada",
  },
  {
    title: "Evitar medicación",
    titleColor: "green",
    p: "El uso de fármacos en niños para tratar un Trastorno Educativo es extremadamente dañino para su desarrollo",
  },
]

export default function NosotrosPage() {
  return (
    <>
      <div className="w-full bg-[#ED3237] font-montserrat py-12 px-4 md:px-12 lg:px-24">
        <h1 className="text-center font-bold uppercase text-white text-4xl md:text-5xl mb-8">
          Nosotros
        </h1>

        {/* Logo + Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 max-w-5xl mx-auto mb-12">
          <div className="hidden md:flex justify-center">
            <div className="bg-[#F2F2F2] rounded-full w-56 h-56 lg:w-64 lg:h-64 flex items-center justify-center p-8 overflow-hidden">
              <Image
                src="/logo.png"
                alt="Logo de Neurodiversion"
                width={180}
                height={180}
                className="object-contain w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 text-white">
            <h2 className="text-2xl font-bold text-center md:text-left">
              ¿Qué buscamos con NeuroDiversion?
            </h2>
            <p className="text-base md:text-lg font-semibold text-center md:text-left">
              Prevención de trastornos educativos, desarrollando Plataforma
              digital y Kit NeuroDiversión de estimulación de funciones
              cognitivas, haciendo seguimiento y asesoría para niños insertos en
              el sistema escolar.
            </p>
          </div>
        </div>

        {/* Cards */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {cards.map(({ title, titleColor, p }) => {
            const color = theme.colors[titleColor]
            return (
              <li
                key={title}
                style={{ boxShadow: "8px 8px 0px rgba(0,0,0,0.9)" }}
                className="rounded-2xl flex flex-col overflow-hidden"
              >
                <header
                  style={{ backgroundColor: color, border: "4px solid #F2F2F2" }}
                  className="px-4 py-4 rounded-t-2xl text-center"
                >
                  <h3
                    className="font-bold text-white text-lg uppercase"
                    style={{ textShadow: "0px 0px 2px rgba(0,0,0,1)" }}
                  >
                    {title}
                  </h3>
                </header>
                <p className="bg-[#F2F2F2] text-black font-semibold text-center px-4 py-4 rounded-b-2xl h-full text-sm">
                  {p}
                </p>
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
