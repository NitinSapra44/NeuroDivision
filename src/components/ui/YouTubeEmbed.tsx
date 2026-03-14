"use client"

import { Play } from "lucide-react"

function getYouTubeId(url: string): string | null {
  if (!url) return null
  // Raw 11-char video ID (no domain)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  // Normalize: ensure protocol is present so new URL() doesn't throw
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    const u = new URL(normalized)
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0]
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v")
      const m = u.pathname.match(/\/(?:embed|shorts|live|video)\/([^/?]+)/)
      if (m) return m[1]
    }
  } catch {}
  // Regex fallback for any remaining formats
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)
  return m ? m[1] : null
}

interface YouTubeEmbedProps {
  url: string
  className?: string
}

export default function YouTubeEmbed({ url, className = "" }: YouTubeEmbedProps) {
  const trimmed = url?.trim() ?? ""
  const videoId = getYouTubeId(trimmed)

  // Local video file (e.g. /placeholder.mp4)
  if (!videoId && (trimmed.startsWith("/") || (trimmed.startsWith("http") && !trimmed.includes("youtube")))) {
    return (
      <video
        src={trimmed}
        controls
        className={`w-full h-full object-contain ${className}`}
      />
    )
  }

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-black/20 text-white font-semibold text-sm px-4 text-center ${className}`}>
        URL de video no válida
      </div>
    )
  }

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`}
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
