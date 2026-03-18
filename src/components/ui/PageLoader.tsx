interface PageLoaderProps {
  dark?: boolean
  bg?: string    // any Tailwind bg-* class, overrides dark
  inline?: boolean  // fills content area instead of covering full screen
}

export default function PageLoader({ dark = false, bg, inline = false }: PageLoaderProps) {
  const bgClass = bg ?? (dark ? "bg-black" : "bg-white")
  const wrapClass = inline
    ? `w-full min-h-screen flex items-center justify-center ${bgClass}`
    : `fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${bgClass}`

  return (
    <div className={wrapClass}>
      <div className="w-48 h-[3px] overflow-hidden">
        <div className="h-full w-1/3 bg-[#ED3237] animate-page-bar" />
      </div>
    </div>
  )
}
