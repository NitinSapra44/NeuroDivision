"use client"

import { useRouter } from "next/navigation"

export default function CheckoutSuccessPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#ED3237] font-montserrat flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border-4 border-black p-10 max-w-lg w-full text-center shadow-xl">
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase mb-6">
          ¡Pago Exitoso, Bienvenido!
        </h1>
        <div className="text-sm text-gray-700 space-y-2 mb-8 text-left">
          <p>Hemos confirmado la recepción del pago a tu orden.</p>
          <p>
            Recibirás el pago en tu Neurodiversión Panel. La dirección incluida en el formulario será
            utilizada para el despacho de tu Kit en 2 a 3 días hábiles.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-black text-white font-bold rounded-full py-3 text-lg border-4 border-black hover:bg-zinc-800 transition"
        >
          Ir a mi panel y comenzar
        </button>
      </div>
    </div>
  )
}
