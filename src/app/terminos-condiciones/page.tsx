"use client"

import { useRouter } from "next/navigation"
import Footer from "@/components/sections/Footer"

export default function TerminosCondicionesPage() {
  const router = useRouter()

  return (
    <>
      <div className="min-h-screen bg-[#ED3237] font-montserrat py-12 px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-center uppercase mb-8 text-white">
            Términos y Condiciones
          </h1>

          <div className="bg-white rounded-2xl p-6 md:p-10 text-sm leading-relaxed space-y-4 text-gray-800">
            <p>
              Al suscribirse a cualquiera de los planes ofrecidos por Neurodiversión, el usuario acepta
              los presentes términos y condiciones en su totalidad.
            </p>

            <p>
              <strong>1. Uso del servicio:</strong> Los planes de suscripción son de uso personal y no
              transferible. Cada suscripción corresponde a un único niño o niña, salvo en el caso del
              Plan Institucional, que incluye grupos de hasta 45 alumnos.
            </p>

            <p>
              <strong>2. Pagos y facturación:</strong> El cobro se realiza de forma mensual o semestral
              según el plan seleccionado. Los pagos se procesan de forma segura a través de MercadoPago.
              Neurodiversión no almacena datos de tarjetas de crédito o débito.
            </p>

            <p>
              <strong>3. Envío del Kit de material:</strong> El kit físico se despacha mediante Starken
              o Chilexpress dentro de 2 a 3 días hábiles desde la confirmación del pago. El número de
              seguimiento será enviado al correo electrónico registrado.
            </p>

            <p>
              <strong>4. Acceso digital:</strong> El acceso a los contenidos digitales de la plataforma
              se habilita de forma inmediata una vez confirmado el pago.
            </p>

            <p>
              <strong>5. Cancelación:</strong> El usuario puede cancelar su suscripción en cualquier
              momento desde su panel de usuario. La cancelación no genera reembolso del período ya
              pagado, pero no se realizarán cobros adicionales.
            </p>

            <p>
              <strong>6. Privacidad:</strong> Los datos personales recopilados serán utilizados
              exclusivamente para la gestión del servicio y el envío del kit. No serán compartidos con
              terceros sin el consentimiento expreso del usuario.
            </p>

            <p>
              <strong>7. Modificaciones:</strong> Neurodiversión se reserva el derecho de modificar
              estos términos y condiciones en cualquier momento. Los cambios serán comunicados por
              correo electrónico con al menos 15 días de anticipación.
            </p>

            <p>
              <strong>8. Ley aplicable:</strong> Estos términos se rigen por la legislación vigente
              en la República de Chile.
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-8">
            <button
              onClick={() => router.back()}
              className="w-full py-3 bg-[#ED3237] text-white font-bold rounded-full border-4 border-black text-lg hover:opacity-90 transition"
            >
              Aceptar
            </button>
            <button
              onClick={() => router.back()}
              className="w-full py-3 bg-black text-white font-bold rounded-full border-4 border-white text-lg hover:bg-zinc-800 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
