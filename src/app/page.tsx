"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import ContactForm from "@/components/sections/ContactForm"
import Footer from "@/components/sections/Footer"

const DEFAULT_VIDEO_ID = "dmvXY-Xs0rk"

type GalleryItem =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; videoId: string; alt: string }

const galleryItems: GalleryItem[] = [
  { type: "image", src: "/home-placeholder-0.webp", alt: "Innovafest imagen 1" },
  { type: "image", src: "/home-placeholder-1.webp", alt: "Innovafest imagen 2" },
  { type: "image", src: "/home-placeholder-2.webp", alt: "Innovafest imagen 3" },
  { type: "image", src: "/home-placeholder-3.webp", alt: "Innovafest imagen 4" },
]

function ImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-[90%]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="w-full h-auto rounded-2xl object-contain"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold hover:bg-black transition"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [videoId, setVideoId] = useState(DEFAULT_VIDEO_ID)
  const [modalSrc, setModalSrc] = useState<{ src: string; alt: string } | null>(null)

  return (
    <>
      <div className="w-full bg-[#FCCD2A] font-montserrat py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-stretch">

          {/* LEFT: Video + Title */}
          <div className="flex-1 flex flex-col border-2 border-white rounded-2xl overflow-hidden shadow-lg">
            <div className="w-full aspect-video bg-black">
              <iframe
                key={videoId}
                className="w-full h-full border-0"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&autoplay=1`}
                title="Neuro Diversión - Video de portada"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="bg-white px-6 py-4 text-center">
              <h1 className="font-bold uppercase text-2xl md:text-3xl">
                Bienvenidos a Innovafest
              </h1>
              <h2 className="text-base md:text-lg font-normal mt-1">
                Neuro Diversión dice presente en el Festival de la Innovación,
                Ciencia y Tecnología.
              </h2>
            </div>
          </div>

          {/* RIGHT: Gallery */}
          <aside className="w-full md:w-72 lg:w-80">
            <ul className="h-80 md:h-full overflow-y-auto flex flex-col gap-4 pr-1" style={{ paddingBlock: "4px" }}>
              {galleryItems.map((item) =>
                item.type === "video" ? (
                  <li
                    key={item.videoId}
                    className="relative rounded-2xl overflow-hidden cursor-pointer shrink-0 group"
                    onClick={() => setVideoId(item.videoId)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                      alt={item.alt}
                      className="w-full aspect-video object-cover border-2 border-white rounded-2xl shadow-md group-hover:scale-[1.02] transition"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 rounded-full w-12 h-12 flex items-center justify-center group-hover:bg-black/80 transition">
                        <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li
                    key={item.src}
                    className="rounded-2xl overflow-hidden cursor-pointer shrink-0"
                    onClick={() => setModalSrc({ src: item.src, alt: item.alt })}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={400}
                      height={225}
                      className="w-full aspect-video object-cover border-2 border-white rounded-2xl shadow-md hover:scale-[1.02] transition"
                    />
                  </li>
                )
              )}
            </ul>
          </aside>

        </div>

        {/* CTA Button */}
        <div className="max-w-7xl mx-auto mt-6">
          <button
            onClick={() => router.push("/login")}
            className="w-full py-4 text-2xl md:text-3xl font-bold text-white bg-black rounded-full border-4 border-white hover:bg-white hover:text-black hover:border-black transition"
          >
            Crear cuenta
          </button>
        </div>
      </div>

      <ContactForm />
      <Footer />

      {/* Image Modal */}
      {modalSrc && (
        <ImageModal src={modalSrc.src} alt={modalSrc.alt} onClose={() => setModalSrc(null)} />
      )}
    </>
  )
}
