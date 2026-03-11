"use client"
import { Accordion } from "@/components/ui/Accordion"
import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"

const faqs = [
  {
    summary: "Solucionar un problema",
    body: "Aquí encontrarás soluciones a los problemas más comunes. Si tu problema persiste, contáctanos directamente a través del formulario de contacto o por nuestros canales de atención al cliente.",
  },
  {
    summary: "Ver videos",
    body: "Accede a nuestra biblioteca de videos educativos y tutoriales. Podrás encontrar contenido sobre el uso de la plataforma y actividades para los niños.",
  },
  {
    summary: "Gestionar tu cuenta y configuración",
    body: "Aprende a administrar los datos de tu cuenta, cambiar tu contraseña, actualizar tu información personal y gestionar las preferencias de notificaciones.",
  },
  {
    summary: "Experiencias supervisadas",
    body: "Las experiencias supervisadas son sesiones guiadas por nuestros especialistas. Puedes solicitar una a través de tu panel de usuario o contactando directamente a un profesional.",
  },
  {
    summary: "Problemas técnicos",
    body: "Si experimentas problemas técnicos con la plataforma, asegúrate de tener una conexión estable a internet. Si el problema persiste, contáctanos indicando el dispositivo y el error que aparece.",
  },
  {
    summary: "Realizar un pedido",
    body: "Para realizar un pedido del kit de material concreto, selecciona tu plan de suscripción y sigue los pasos de compra. El envío tiene un tiempo estimado de 5 a 10 días hábiles.",
  },
  {
    summary: "Métodos de pago",
    body: "Aceptamos tarjetas de crédito, débito y transferencias bancarias. Todos los pagos son procesados de forma segura a través de nuestras plataformas certificadas.",
  },
  {
    summary: "Recuperar tu contraseña",
    body: "Si olvidaste tu contraseña, haz clic en «¿Olvidaste tu contraseña?» en la página de inicio de sesión. Recibirás un correo electrónico con las instrucciones para restablecerla.",
  },
  {
    summary: "Políticas y seguridad",
    body: "Consulta nuestras políticas de privacidad, términos y condiciones y política de devoluciones en los documentos legales disponibles en nuestra plataforma.",
  },
]

export default function SoportePage() {
  return (
    <>
      <div className="w-full bg-[#76C04E] font-montserrat py-12 px-4 md:px-12 lg:px-24">
        <h1 className="text-center font-bold uppercase text-white text-4xl md:text-5xl mb-8">
          Soporte
        </h1>

        <ul className="max-w-4xl mx-auto flex flex-col gap-2">
          {faqs.map(({ summary, body }, index) => (
            <li key={index} className="text-center">
              <Accordion
                summary={summary}
                body={
                  <p className="text-left text-[#F2F2F2] font-montserrat px-6 py-4 text-sm md:text-base">
                    {body}
                  </p>
                }
                name="soporte"
                defaultOpen={index === 0}
                summaryClassName="list-none border-2 border-[#F2F2F2] bg-black text-[#F2F2F2] rounded-full cursor-pointer hover:bg-[#F2F2F2] hover:text-black hover:border-black transition-colors font-bold"
                summaryStyle={{ paddingBlock: "14px", fontSize: "16px" }}
              />
            </li>
          ))}
        </ul>
      </div>
      <ContactForm />
      <Footer />
    </>
  )
}
