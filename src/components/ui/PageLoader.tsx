// Sober full-page loader: thin red bar sweeping across the top, clean background.
interface PageLoaderProps {
  dark?: boolean
}

export default function PageLoader({ dark = false }: PageLoaderProps) {
  return (
    <div className={`fixed inset-0 z-50 ${dark ? "bg-black" : "bg-white"} overflow-hidden`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-transparent overflow-hidden">
        <div className="h-full w-1/3 bg-[#ED3237] animate-page-bar" />
      </div>
    </div>
  )
}
