import Image from "next/image"
import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"

type Professional = {
  src: string
  title: string
  subTitle: string
  socialMedia: {
    icon: string
    text: string
  }
}

const professionals: Professional[] = [
  {
    src: "/contact-placeholder-0.webp",
    title: "Alejandra Solar Ruiz",
    subTitle: "CEO, Psicopedagoga",
    socialMedia: {
      icon: "/socialmedia-instagram.svg",
      text: "alejandra_solarr",
    },
  },
  {
    src: "/contact-placeholder-1.webp",
    title: "Paola Ramírez Solar",
    subTitle: "Psicopedagoga",
    socialMedia: {
      icon: "/socialmedia-whatsapp.svg",
      text: "+56 9 8260 5421",
    },
  },
  {
    src: "/contact-placeholder-2.webp",
    title: "Patricia Ruiz",
    subTitle: "Psicopedagoga",
    socialMedia: {
      icon: "/email-icon.svg",
      text: "asolar@neurodiversion",
    },
  },
]

export default function ContactoPage() {
  return (
    <>
      <div className="w-full bg-white font-montserrat py-12 px-4 md:px-12 lg:px-24">
        <h1 className="text-center font-bold uppercase text-black text-4xl md:text-5xl mb-10">
          Contacta a un Profesional
        </h1>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 max-w-5xl mx-auto justify-items-center mb-12">
          {professionals.map(({ src, title, subTitle, socialMedia }) => (
            <li key={title} className="flex flex-col items-center gap-2">
              <Image
                src={src}
                alt={`contact ${title}`}
                width={200}
                height={200}
                className="rounded-full object-cover border-4 border-[#76C04E]"
                style={{ width: "200px", height: "200px", objectPosition: "50% 10%" }}
              />
              <h2 className="text-black font-bold text-xl text-center capitalize mt-2">
                {title}
              </h2>
              <h3 className="text-black text-base text-center uppercase font-semibold">
                {subTitle}
              </h3>
              <div className="flex flex-col items-center gap-2 mt-4 cursor-pointer hover:opacity-80 transition">
                <Image
                  src={socialMedia.icon}
                  alt={socialMedia.text}
                  width={48}
                  height={48}
                  className="object-contain"
                />
                <p className="text-[#76C04E] font-bold text-lg text-center">
                  {socialMedia.text}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-black text-sm md:text-base max-w-3xl mx-auto px-2 italic">
          &quot;Este servicio puede solicitarse una vez dentro de un periodo de seis
          meses y está destinado a la revisión de situaciones puntuales, como dudas
          de apoderados, solicitudes de diagnóstico o tratamiento. Para gestionarlo,
          es necesario completar el formulario de contacto con los antecedentes de la
          solicitud&quot;
        </p>
      </div>
      <ContactForm />
      <Footer />
    </>
  )
}
