import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"

export default function CalendarioPage() {
  return (
    <>
      <div className="w-full bg-[#FCCD2A] font-montserrat py-12 px-4 md:px-12 lg:px-24">
        <h1 className="text-center font-bold uppercase text-black text-4xl md:text-5xl mb-4">
          Calendario de Actividades
        </h1>

        <p className="text-black text-sm md:text-base max-w-4xl mx-auto mb-8">
          Capacitaciones online o presenciales realizadas por{" "}
          <strong>Alejandra Solar</strong>, <strong>Paola Ramírez</strong> y/o{" "}
          <strong>Patricia Ruiz</strong> (o cualquiera por parte del equipo de{" "}
          <strong>NeuroDiversión</strong>) para clientes (adultos a cargo e
          instituciones educativas) sobre concientización y uso correcto de kit
          y plataforma digital.
        </p>

        <div className="w-full">
          <iframe
            src="https://calendar.google.com/calendar/embed?height=600&wkst=2&ctz=America%2FSantiago&showPrint=0&hl=es_419&src=dHJlc3ZlY2VzbkBnbWFpbC5jb20&color=%23039be5"
            style={{
              border: "solid 1px #777",
              borderRadius: "16px",
              boxShadow: "8px 8px 0px rgba(0,0,0,0.9)",
              width: "100%",
            }}
            height="500"
            scrolling="no"
          />
        </div>
      </div>
      <ContactForm />
      <Footer />
    </>
  )
}
