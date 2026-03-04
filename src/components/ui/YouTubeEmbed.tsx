"use client"

import { Play } from "lucide-react"

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0]
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v")
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/)
      if (embedMatch) return embedMatch[1]
      const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shortsMatch) return shortsMatch[1]
    }
  } catch {}
  return null
}

interface YouTubeEmbedProps {
  url: string
  className?: string
}

export default function YouTubeEmbed({ url, className = "" }: YouTubeEmbedProps) {
  const videoId = getYouTubeId(url)

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-black/20 text-white font-semibold text-sm px-4 text-center ${className}`}>
        URL de video no válida
      </div>
    )
  }

  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className={`w-full h-full border-0 ${className}`}
      title="Actividad video"
    />
  )
}

export function VideoPlaceholder() {
  return (
    <div className="w-28 h-28 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center">
      <Play className="w-12 h-12 md:w-16 md:h-16 text-[#ED3237]" fill="#ED3237" />
    </div>
  )
}
